"""
Flask application — all API routes.
Shared between the Lambda handler (lambda_function.py) and local dev.
"""

import os
import uuid
import hashlib
import json
from datetime import datetime, timezone
from flask import Flask, request, jsonify, make_response
from db import query, execute, execute_returning
from teams import send_teams_alert, test_teams_webhook

app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False

# ── CORS ──────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = {
    "http://airbrake.s3-website-us-east-1.amazonaws.com",
    "http://localhost:3000",
    "http://localhost:3001",
}

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin", "")
    allow_origin = origin if origin in ALLOWED_ORIGINS else "*"
    response.headers["Access-Control-Allow-Origin"]  = allow_origin
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-API-Key"
    response.headers["Access-Control-Max-Age"]        = "86400"
    if origin in ALLOWED_ORIGINS:
        response.headers["Vary"] = "Origin"
    return response

@app.route("/api/<path:p>", methods=["OPTIONS"])
@app.route("/api/", methods=["OPTIONS"])
def options_handler(p=""):
    return make_response("", 204)

# ── Auth helpers ──────────────────────────────────────────────────────────────
DEV_SESSIONS = {
    "dev-token-admin":     {"userId": "dev-admin",     "role": "admin"},
    "dev-token-developer": {"userId": "dev-developer", "role": "developer"},
    "dev-token-viewer":    {"userId": "dev-viewer",    "role": "viewer"},
}

def get_session():
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:].strip()
        return DEV_SESSIONS.get(token)
    return None

def require_role(*roles):
    """Return (session, error_response). If error_response is not None, return it."""
    session = get_session()
    if not session:
        return None, (jsonify({"error": "Unauthorized"}), 401)
    if session["role"] not in roles:
        return None, (jsonify({"error": "Forbidden"}), 403)
    return session, None

# ── DB helpers ────────────────────────────────────────────────────────────────
SYSTEM_TABLES = (
    "alert_rules", "alert_history", "users", "projects", "saved_filters",
    "retention_policies", "parse_errors", "audit_log", "break_groups",
    "breaks", "error_solutions",
)

def get_project_tables():
    col_check = query("""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'projects'
              AND column_name = 'is_live'
        ) AS exists
    """)
    has_is_live = col_check[0]["exists"] if col_check else False

    if has_is_live:
        live_filter = (
            "AND REPLACE(c.table_name, '_', ' ') "
            "IN (SELECT name FROM projects WHERE is_live = true)"
        )
    else:
        live_filter = (
            "AND c.table_name IN "
            "('tand_f_rubriq_processing', 'language_quality_score')"
        )

    rows = query(f"""
        SELECT c.table_name
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.column_name = 'project_name'
          AND c.table_name NOT IN %s
          AND c.table_name IN (
              SELECT table_name FROM information_schema.columns
              WHERE table_schema = 'public' AND column_name = 'error_status'
          )
          AND c.table_name IN (
              SELECT table_name FROM information_schema.columns
              WHERE table_schema = 'public' AND column_name = 'error_hash'
          )
          {live_filter}
        ORDER BY c.table_name
    """, (SYSTEM_TABLES,))
    return [r["table_name"] for r in rows]


def find_table(project_name: str):
    """Case-insensitive lookup — returns actual DB table name or None."""
    raw = project_name.replace(" ", "_")
    rows = query(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'public' AND LOWER(table_name) = LOWER(%s)",
        (raw,),
    )
    return rows[0]["table_name"] if rows else None


def build_error_union(tables, extra_where=""):
    parts = [
        f"SELECT REPLACE(project_name, '_', ' ') AS project_name, "
        f"file_name, error, error_detail, error_hash, timestamp, reopened_at "
        f"FROM \"{t}\" "
        f"WHERE error IS NOT NULL AND error <> '' "
        f"AND error_status IN ('open', 'reopened'){extra_where}"
        for t in tables
    ]
    return " UNION ALL ".join(parts)


def build_total_union(tables):
    parts = [
        f"SELECT REPLACE(project_name, '_', ' ') AS project_name, COUNT(*) AS cnt "
        f"FROM \"{t}\" GROUP BY project_name"
        for t in tables
    ]
    return " UNION ALL ".join(parts)


# ═══════════════════════════════════════════════════════════════════════════════
# SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "ts": datetime.now(timezone.utc).isoformat()})


@app.route("/api/health/teams")
def health_teams():
    return jsonify(test_teams_webhook())


# ═══════════════════════════════════════════════════════════════════════════════
# PROJECTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/projects")
def list_projects():
    category = request.args.get("category")
    try:
        # Check if projects registry table exists
        tbl = query(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'projects' LIMIT 1"
        )
        if tbl:
            if category:
                rows = query(
                    "SELECT id, name, category FROM projects WHERE category = %s ORDER BY name",
                    (category,),
                )
            else:
                rows = query("SELECT id, name, category FROM projects ORDER BY name")
            return jsonify(rows)

        # Fallback: discover from information_schema
        rows = query(
            "SELECT DISTINCT table_name FROM information_schema.columns "
            "WHERE table_schema = 'public' AND column_name = 'project_name' "
            "AND table_name NOT IN %s ORDER BY table_name",
            (SYSTEM_TABLES,),
        )
        projects = [
            {"id": str(i + 1), "name": r["table_name"].replace("_", " "), "category": "Unknown"}
            for i, r in enumerate(rows)
        ]
        if category:
            projects = [p for p in projects if p["category"] == category]
        return jsonify(projects)
    except Exception as e:
        print(f"[Projects] error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/projects/live")
def list_live_projects():
    try:
        tbl = query(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'projects' LIMIT 1"
        )
        if not tbl:
            return jsonify([])
        rows = query(
            "SELECT id, name, category, is_live FROM projects WHERE is_live = true ORDER BY name"
        )
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/projects/<path:name>/logs")
def project_logs(name):
    project_name = name
    table = find_table(project_name)
    if not table:
        return jsonify({
            "exists": False, "tableName": project_name.replace(" ", "_"),
            "total": 0, "filesProcessed": 0, "success": 0, "failure": 0,
            "totalCost": None, "errors": [], "logs": [],
        })
    try:
        logs = query(
            f'SELECT file_name, timestamp, success_count, failure_count, error, '
            f'llm_usage, input_tokens, output_tokens, calculated_cost, word_count, file_type, '
            f'error_status, resolved_at, reopened_at '
            f'FROM "{table}" ORDER BY timestamp DESC LIMIT 500'
        )
        total = len(logs)
        success = sum(1 for r in logs if not r.get("error"))
        failure = sum(1 for r in logs if r.get("error") and r.get("error_status") != "resolved")
        raw_cost = sum(float(r.get("calculated_cost") or 0) for r in logs)
        total_cost = f"${raw_cost:.4f}" if raw_cost > 0 else None
        errors = [
            {"timestamp": str(r["timestamp"]), "message": r["error"]}
            for r in logs
            if r.get("error") and r.get("error_status") in ("open", "reopened")
        ]
        visible_logs = [
            {**r, "error": None if r.get("error_status") == "resolved" else r.get("error")}
            for r in logs
        ]
        # Serialize datetimes
        def serialize(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            return obj
        visible_logs = [{k: serialize(v) for k, v in row.items()} for row in visible_logs]
        errors = [{k: serialize(v) for k, v in e.items()} for e in errors]
        return jsonify({
            "exists": True, "tableName": table, "total": total,
            "filesProcessed": total, "success": success, "failure": failure,
            "totalCost": total_cost, "errors": errors, "logs": visible_logs,
        })
    except Exception as e:
        print(f"[Projects] logs error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/projects/<path:name>/errors", methods=["POST"])
def upsert_project_error(name):
    project_name = name
    table = find_table(project_name)
    if not table:
        return jsonify({"error": f"No table found for project: {project_name}"}), 404
    try:
        body = request.get_json() or {}
        file_name    = str(body.get("file_name", ""))
        error_detail = (body.get("error_detail") or "").strip() or None
        short_error  = str(body.get("error", "")).strip()

        if error_detail:
            lines = [l.strip() for l in error_detail.split("\n") if l.strip()]
            if lines:
                derived = lines[-1].split(":")[0].strip()
                if derived:
                    short_error = derived

        if not short_error:
            return jsonify({"error": "error or error_detail is required"}), 400

        error_hash = hashlib.md5(short_error.lower().strip().encode()).hexdigest()

        updated = execute_returning(
            f'UPDATE "{table}" SET failure_count = failure_count + 1, file_name = %s, '
            f'timestamp = NOW(), error_detail = COALESCE(%s, error_detail), '
            f"error_status = CASE WHEN error_status = 'resolved' THEN 'reopened' ELSE error_status END, "
            f"reopened_at = CASE WHEN error_status = 'resolved' THEN NOW() ELSE reopened_at END, "
            f"resolved_at = CASE WHEN error_status = 'resolved' THEN NULL ELSE resolved_at END "
            f'WHERE error_hash = %s RETURNING id, error_status, failure_count',
            (file_name, error_detail, error_hash),
        )
        if updated:
            action = "reopened" if updated["error_status"] == "reopened" else "updated"
            return jsonify({"action": action, "error_status": updated["error_status"],
                            "failure_count": updated["failure_count"]})

        inserted = execute_returning(
            f'INSERT INTO "{table}" (id, project_name, file_name, timestamp, '
            f'success_count, failure_count, error, error_detail, error_hash, error_status) '
            f"VALUES (%s, %s, %s, NOW(), 0, 1, %s, %s, %s, 'open') "
            f'RETURNING id, error_status, failure_count',
            (str(uuid.uuid4()), project_name, file_name, short_error, error_detail, error_hash),
        )
        return jsonify({"action": "inserted", "error_status": inserted["error_status"],
                        "failure_count": inserted["failure_count"]})
    except Exception as e:
        print(f"[Projects] upsert error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/projects/<path:name>/errors/<hash>/resolve", methods=["PATCH"])
def resolve_project_error(name, hash):
    table = find_table(name)
    if not table:
        return jsonify({"error": f"No table found for project: {name}"}), 404
    try:
        execute(
            f'UPDATE "{table}" SET error_status = %s, resolved_at = NOW(), '
            f'reopened_at = NULL WHERE error_hash = %s',
            ("resolved", hash),
        )
        return jsonify({"action": "resolved"})
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/projects/<path:name>/live", methods=["PATCH"])
def toggle_project_live(name):
    body = request.get_json() or {}
    is_live = body.get("is_live")
    if not isinstance(is_live, bool):
        return jsonify({"error": "Body must contain { is_live: true | false }"}), 400
    try:
        tbl = query(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'projects' LIMIT 1"
        )
        if not tbl:
            return jsonify({"error": "projects registry table not found"}), 404
        row = execute_returning(
            "UPDATE projects SET is_live = %s WHERE name = %s "
            "RETURNING id, name, category, is_live",
            (is_live, name),
        )
        if not row:
            return jsonify({"error": f"Project not found: {name}"}), 404
        return jsonify(row)
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# INGEST
# ═══════════════════════════════════════════════════════════════════════════════

def _insert_row(project_name, table, file_name, error, error_detail,
                error_hash, error_status, success_count, failure_count,
                word_count, file_type, input_tokens, output_tokens,
                calculated_cost, llm_usage):
    row_id = str(uuid.uuid4())
    return execute_returning(
        f'INSERT INTO "{table}" ('
        f'id, project_name, file_name, timestamp, '
        f'success_count, failure_count, error, error_detail, error_hash, error_status, '
        f'word_count, file_type, input_tokens, output_tokens, calculated_cost, llm_usage'
        f') VALUES (%s,%s,%s,NOW(),%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) '
        f'RETURNING id, project_name, file_name, error, error_detail, '
        f'error_hash, error_status, success_count, failure_count, timestamp',
        (row_id, project_name, file_name,
         success_count, failure_count, error, error_detail,
         error_hash, error_status,
         word_count, file_type, input_tokens, output_tokens,
         calculated_cost, llm_usage),
    )


def _parse_optional(body):
    return {
        "file_name":      body.get("file_name") or None,
        "error_detail":   body.get("error_detail") or None,
        "success_count":  body.get("success_count", 0),
        "failure_count":  body.get("failure_count", 1),
        "word_count":     body.get("word_count"),
        "file_type":      body.get("file_type"),
        "input_tokens":   body.get("input_tokens"),
        "output_tokens":  body.get("output_tokens"),
        "calculated_cost":body.get("calculated_cost"),
        "llm_usage":      body.get("llm_usage"),
    }


@app.route("/api/ingest/error", methods=["POST"])
def ingest_error():
    body         = request.get_json() or {}
    project_name = str(body.get("project_name", "")).strip()
    error        = str(body.get("error", "")).strip()
    if not project_name:
        return jsonify({"error": "project_name is required"}), 400
    if not error:
        return jsonify({"error": "error is required"}), 400
    if error.startswith("{") and ("workflowId" in error or "workflowStatus" in error):
        return jsonify({"error": "Invalid error value — workflow/system response passed"}), 400

    table = find_table(project_name)
    if not table:
        return jsonify({"error": f'No table found for project "{project_name}"'}), 404

    opt = _parse_optional(body)
    import time, random
    error_hash = hashlib.md5(
        f'{error.lower().strip()}:{time.time()}:{random.random()}'.encode()
    ).hexdigest()

    try:
        inserted = _insert_row(
            project_name, table, opt["file_name"], error, opt["error_detail"],
            error_hash, "open",
            opt.get("success_count", 0), opt.get("failure_count", 1),
            opt["word_count"], opt["file_type"], opt["input_tokens"],
            opt["output_tokens"], opt["calculated_cost"], opt["llm_usage"],
        )
        print(f'[Ingest] ❌ Error row → "{project_name}" | {error}')
        send_teams_alert("Error Ingest", "New Error", project_name, error,
                         error_detail=opt["error_detail"])
        row = {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in inserted.items()}
        return jsonify({"success": True, "type": "error", **row}), 201
    except Exception as e:
        print(f"[Ingest] error: {e}")
        return jsonify({"error": "Internal server error", "detail": str(e)}), 500


@app.route("/api/ingest/log", methods=["POST"])
def ingest_log():
    body         = request.get_json() or {}
    project_name = str(body.get("project_name", "")).strip()
    if not project_name:
        return jsonify({"error": "project_name is required"}), 400

    table = find_table(project_name)
    if not table:
        return jsonify({"error": f'No table found for project "{project_name}"'}), 404

    opt   = _parse_optional(body)
    error = str(body.get("error", "")).strip()
    is_workflow = error.startswith("{") and ("workflowId" in error or "workflowStatus" in error)
    is_error    = bool(error) and not is_workflow

    import time, random
    error_hash = (
        hashlib.md5(f'{error.lower().strip()}:{time.time()}:{random.random()}'.encode()).hexdigest()
        if is_error else None
    )
    success_count = body.get("success_count", 0 if is_error else 1)
    failure_count = body.get("failure_count", 1 if is_error else 0)

    try:
        inserted = _insert_row(
            project_name, table, opt["file_name"],
            error if is_error else None, opt["error_detail"],
            error_hash, "open" if is_error else None,
            success_count, failure_count,
            opt["word_count"], opt["file_type"], opt["input_tokens"],
            opt["output_tokens"], opt["calculated_cost"], opt["llm_usage"],
        )
        t = "error" if is_error else "success"
        print(f'[Ingest] {"❌" if is_error else "✅"} {t} row → "{project_name}"')
        if is_error:
            send_teams_alert("Log Ingest", "New Error", project_name, error,
                             error_detail=opt["error_detail"])
        row = {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in inserted.items()}
        return jsonify({"success": True, "type": t, **row}), 201
    except Exception as e:
        print(f"[Ingest] log error: {e}")
        return jsonify({"error": "Internal server error", "detail": str(e)}), 500


@app.route("/api/ingest/success", methods=["POST"])
def ingest_success():
    body         = request.get_json() or {}
    project_name = str(body.get("project_name", "")).strip()
    if not project_name:
        return jsonify({"error": "project_name is required"}), 400

    table = find_table(project_name)
    if not table:
        return jsonify({"error": f'No table found for project "{project_name}"'}), 404

    opt = _parse_optional(body)
    success_count = body.get("success_count", 1)

    try:
        inserted = _insert_row(
            project_name, table, opt["file_name"],
            None, None, None, None,
            success_count, 0,
            opt["word_count"], opt["file_type"], opt["input_tokens"],
            opt["output_tokens"], opt["calculated_cost"], opt["llm_usage"],
        )
        row = {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in inserted.items()}
        return jsonify({"success": True, "type": "success", **row}), 201
    except Exception as e:
        return jsonify({"error": "Internal server error", "detail": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/dashboard/top-projects")
def dashboard_top_projects():
    try:
        tables = get_project_tables()
        if not tables:
            return jsonify({"projects": []})
        union = build_total_union(tables)
        rows = query(f"""
            SELECT project_name, SUM(cnt)::int AS total
            FROM ({union}) AS combined
            GROUP BY project_name ORDER BY total DESC LIMIT 10
        """)
        return jsonify({"projects": rows})
    except Exception as e:
        print(f"[Dashboard] top-projects: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/dashboard/top-error-projects")
def dashboard_top_error_projects():
    try:
        tables = get_project_tables()
        if not tables:
            return jsonify({"projects": []})
        parts = [
            f"SELECT REPLACE(project_name, '_', ' ') AS project_name, COUNT(*) AS cnt "
            f"FROM \"{t}\" WHERE error IS NOT NULL AND error <> '' "
            f"AND error_status IN ('open','reopened') GROUP BY project_name"
            for t in tables
        ]
        union = " UNION ALL ".join(parts)
        rows = query(f"""
            SELECT project_name, SUM(cnt)::int AS total
            FROM ({union}) AS combined
            GROUP BY project_name HAVING SUM(cnt) > 0
            ORDER BY total DESC LIMIT 10
        """)
        return jsonify({"projects": rows})
    except Exception as e:
        print(f"[Dashboard] top-error-projects: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/dashboard/today-errors")
def dashboard_today_errors():
    try:
        tables = get_project_tables()
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if not tables:
            return jsonify({"date": date_str, "errors": []})

        today_where = (
            " AND ((timestamp AT TIME ZONE 'UTC' >= CURRENT_DATE "
            "AND timestamp AT TIME ZONE 'UTC' < CURRENT_DATE + INTERVAL '1 day') "
            "OR (reopened_at IS NOT NULL "
            "AND reopened_at AT TIME ZONE 'UTC' >= CURRENT_DATE "
            "AND reopened_at AT TIME ZONE 'UTC' < CURRENT_DATE + INTERVAL '1 day'))"
        )
        union = build_error_union(tables, today_where)
        rows = query(f"""
            SELECT project_name AS project, file_name, error, error_detail,
                   error_hash, timestamp
            FROM ({union}) AS combined
            ORDER BY timestamp DESC
        """)
        rows = [{k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in r.items()} for r in rows]
        return jsonify({"date": date_str, "errors": rows})
    except Exception as e:
        print(f"[Dashboard] today-errors: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/dashboard/errors")
def dashboard_errors():
    from_ts = request.args.get("from", "")
    to_ts   = request.args.get("to", "")
    try:
        tables = get_project_tables()
        if not tables:
            return jsonify({"errors": []})
        extra = ""
        if from_ts:
            safe = from_ts.replace("'", "''")
            extra += f" AND timestamp >= '{safe}'"
        if to_ts:
            safe = to_ts.replace("'", "''")
            extra += f" AND timestamp <= '{safe}'"
        union = build_error_union(tables, extra)
        rows = query(f"""
            SELECT project_name AS project, file_name, error, error_detail,
                   error_hash, timestamp
            FROM ({union}) AS combined
            ORDER BY timestamp DESC LIMIT 2000
        """)
        rows = [{k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in r.items()} for r in rows]
        return jsonify({"errors": rows})
    except Exception as e:
        print(f"[Dashboard] errors: {e}")
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# BREAKS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/breaks/grouped")
def breaks_grouped():
    page   = max(1, int(request.args.get("page", 1) or 1))
    limit  = min(100, max(1, int(request.args.get("limit", 20) or 20)))
    status_f  = request.args.get("status", "")
    project_f = request.args.get("project", "")
    from_ts   = request.args.get("from", "")
    to_ts     = request.args.get("to", "")

    try:
        tables = get_project_tables()
        if not tables:
            return jsonify({"data": [], "total": 0, "page": page, "limit": limit})

        date_where = ""
        if from_ts:
            date_where += f" AND timestamp >= '{from_ts.replace(chr(39), chr(39)*2)}'"
        if to_ts:
            date_where += f" AND timestamp <= '{to_ts.replace(chr(39), chr(39)*2)}'"

        if project_f:
            filtered = [
                t for t in tables
                if t.lower() == project_f.lower().replace(" ", "_")
                or t.lower().replace("_", " ") == project_f.lower()
            ]
        else:
            filtered = tables

        if not filtered:
            return jsonify({"data": [], "total": 0, "page": page, "limit": limit})

        parts = [
            f"SELECT REPLACE(project_name,'_',' ') AS project_name, error, error_detail, "
            f"error_hash, failure_count, timestamp, error_status, reopened_at "
            f"FROM \"{t}\" WHERE error IS NOT NULL AND error <> '' "
            f"AND error_status IN ('open','reopened'){date_where}"
            for t in filtered
        ]
        union = " UNION ALL ".join(parts)

        grouped = f"""
            SELECT project_name,
                   error AS error_message,
                   COALESCE(error_hash, MD5(LOWER(TRIM(error)))) AS error_hash,
                   SUM(failure_count)::int AS occurrence_count,
                   MIN(timestamp) AS first_seen,
                   COALESCE(MAX(reopened_at), MAX(timestamp)) AS last_seen,
                   CASE
                     WHEN BOOL_OR(error_status = 'reopened') THEN 'regression'
                     WHEN SUM(failure_count) = 1 THEN 'new'
                     ELSE 'existing'
                   END AS status
            FROM ({union}) AS all_errors
            GROUP BY project_name, error, COALESCE(error_hash, MD5(LOWER(TRIM(error))))
        """

        conditions = []
        if status_f:
            conditions.append(f"status = '{status_f.replace(chr(39), chr(39)*2)}'")
        if project_f:
            conditions.append(f"project_name = '{project_f.replace(chr(39), chr(39)*2)}'")
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        total_rows = query(f"SELECT COUNT(*) AS cnt FROM ({grouped}) AS g {where}")
        total = int(total_rows[0]["cnt"]) if total_rows else 0

        offset = (page - 1) * limit
        data = query(f"""
            SELECT * FROM ({grouped}) AS g {where}
            ORDER BY last_seen DESC NULLS LAST
            LIMIT {limit} OFFSET {offset}
        """)
        data = [{k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in r.items()} for r in data]
        return jsonify({"data": data, "total": total, "page": page, "limit": limit})
    except Exception as e:
        print(f"[Breaks] grouped error: {e}")
        return jsonify({"error": "Internal server error"}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# BREAKS (individual detail — used by BreakDetail.tsx)
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/breaks/<break_id>")
def get_break(break_id):
    """
    GET /api/breaks/:id
    Returns break detail with correlatedLogs: []
    Note: Aurora DSQL has no 'breaks' table yet — returns 404 if not found.
    This is used by BreakDetail.tsx which is not currently routed in the app.
    """
    try:
        rows = query("SELECT * FROM breaks WHERE id = %s", (break_id,))
        if not rows:
            return jsonify({"error": "Not Found", "message": "Break not found."}), 404
        row = {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in rows[0].items()}
        row["correlatedLogs"] = []  # correlated logs from a separate logs table
        return jsonify(row)
    except Exception as e:
        # Table may not exist in Aurora DSQL
        return jsonify({"error": "Not Found", "message": "Break not found."}), 404


# ═══════════════════════════════════════════════════════════════════════════════
# LEGACY DASHBOARD HOOK (GET /api/dashboard — used by useDashboard.ts hook)
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/dashboard")
def dashboard_legacy():
    """
    GET /api/dashboard
    Used by the useDashboard.ts hook (not wired to any page currently).
    Returns aggregated break counts, trend, top services, etc.
    Falls back to empty data if the breaks/logs tables don't exist in Aurora DSQL.
    """
    try:
        # Break counts
        def safe_count(sql):
            try:
                r = query(sql)
                return int(r[0]["count"]) if r else 0
            except Exception:
                return 0

        last24h = safe_count("SELECT COUNT(*) AS count FROM breaks WHERE timestamp >= NOW() - INTERVAL '24 hours'")
        last7d  = safe_count("SELECT COUNT(*) AS count FROM breaks WHERE timestamp >= NOW() - INTERVAL '7 days'")

        return jsonify({
            "breakCounts":      {"last24h": last24h, "last7d": last7d},
            "errorRateTrend":   [],
            "topServices":      [],
            "timeSeries":       [],
            "severityBreakdown":[],
            "deploymentEvents": [],
            "airbrakeUnreachable": False,
        })
    except Exception as e:
        return jsonify({
            "breakCounts":      {"last24h": 0, "last7d": 0},
            "errorRateTrend":   [],
            "topServices":      [],
            "timeSeries":       [],
            "severityBreakdown":[],
            "deploymentEvents": [],
            "airbrakeUnreachable": True,
        })

@app.route("/api/alert-rules", methods=["GET"])
def get_alert_rules():
    try:
        rows = query(
            "SELECT id, rule_name, project_name, alert_type, threshold, "
            "window_minutes, is_active, created_at FROM alert_rules ORDER BY created_at DESC"
        )
        rows = [{k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in r.items()} for r in rows]
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/alert-rules", methods=["POST"])
def create_alert_rule():
    body = request.get_json() or {}
    try:
        row = execute_returning(
            "INSERT INTO alert_rules (id, rule_name, project_name, alert_type, "
            "threshold, window_minutes, is_active) VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING *",
            (str(uuid.uuid4()), body.get("rule_name"), body.get("project_name"),
             body.get("alert_type"), body.get("threshold"), body.get("window_minutes"),
             body.get("is_active", True)),
        )
        row = {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in row.items()}
        return jsonify(row), 201
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/alert-rules/<rule_id>", methods=["PUT"])
def update_alert_rule(rule_id):
    body = request.get_json() or {}
    try:
        row = execute_returning(
            "UPDATE alert_rules SET rule_name=%s, project_name=%s, alert_type=%s, "
            "threshold=%s, window_minutes=%s, is_active=%s WHERE id=%s RETURNING *",
            (body.get("rule_name"), body.get("project_name"), body.get("alert_type"),
             body.get("threshold"), body.get("window_minutes"), body.get("is_active"), rule_id),
        )
        if not row:
            return jsonify({"error": "Rule not found"}), 404
        row = {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in row.items()}
        return jsonify(row)
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/alert-rules/<rule_id>/toggle", methods=["PATCH"])
def toggle_alert_rule(rule_id):
    try:
        row = execute_returning(
            "UPDATE alert_rules SET is_active = NOT is_active WHERE id=%s RETURNING *",
            (rule_id,),
        )
        if not row:
            return jsonify({"error": "Rule not found"}), 404
        row = {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in row.items()}
        return jsonify(row)
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/alert-rules/<rule_id>", methods=["DELETE"])
def delete_alert_rule(rule_id):
    try:
        count = execute("DELETE FROM alert_rules WHERE id=%s", (rule_id,))
        if count == 0:
            return jsonify({"error": "Rule not found"}), 404
        return make_response("", 204)
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/alert-history")
def get_alert_history():
    conditions, values = [], []
    if request.args.get("project"):
        conditions.append("h.project_name = %s"); values.append(request.args["project"])
    if request.args.get("alert_type"):
        conditions.append("h.alert_type = %s"); values.append(request.args["alert_type"])
    if request.args.get("from"):
        conditions.append("h.triggered_at >= %s"); values.append(request.args["from"])
    if request.args.get("to"):
        conditions.append("h.triggered_at <= %s"); values.append(request.args["to"])
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    try:
        rows = query(
            f"SELECT h.id, h.rule_id, r.rule_name, h.project_name, h.error, "
            f"h.alert_type, h.triggered_at FROM alert_history h "
            f"LEFT JOIN alert_rules r ON r.id = h.rule_id {where} "
            f"ORDER BY h.triggered_at DESC",
            values if values else None,
        )
        rows = [{k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in r.items()} for r in rows]
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# ERROR SOLUTIONS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/error-solution/resolve", methods=["POST"])
def resolve_error_solution():
    body = request.get_json() or {}
    error_hash   = body.get("error_hash")
    project_name = body.get("project_name")
    if not error_hash or not project_name:
        return jsonify({"error": "error_hash and project_name are required"}), 400
    table = find_table(project_name)
    if not table:
        return jsonify({"error": f"No table found for project: {project_name}"}), 404
    try:
        count = execute(
            f"UPDATE \"{table}\" SET error_status = 'resolved', resolved_at = NOW() "
            f"WHERE error_hash = %s AND error_status IN ('open', 'reopened')",
            (error_hash,),
        )
        return jsonify({"resolved": count, "project_name": project_name, "error_hash": error_hash})
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/error-solution/<error_hash>", methods=["GET"])
def get_error_solution(error_hash):
    try:
        rows = query(
            "SELECT solution, updated_at FROM error_solutions WHERE error_hash = %s",
            (error_hash,),
        )
        if not rows:
            return jsonify({"solution": None})
        r = rows[0]
        return jsonify({"solution": r["solution"],
                        "updated_at": r["updated_at"].isoformat() if r.get("updated_at") else None})
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/error-solution", methods=["POST"])
def upsert_error_solution():
    body       = request.get_json() or {}
    error_hash = body.get("error_hash")
    solution   = body.get("solution")
    if not error_hash:
        return jsonify({"error": "error_hash is required"}), 400
    try:
        count = execute(
            "UPDATE error_solutions SET solution = %s, updated_at = NOW() WHERE error_hash = %s",
            (solution, error_hash),
        )
        if count > 0:
            row = query("SELECT * FROM error_solutions WHERE error_hash = %s", (error_hash,))[0]
        else:
            row = execute_returning(
                "INSERT INTO error_solutions (id, error_hash, solution) VALUES (%s,%s,%s) RETURNING *",
                (str(uuid.uuid4()), error_hash, solution),
            )
        row = {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in row.items()}
        return jsonify(row)
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/error-solution/<error_hash>", methods=["DELETE"])
def delete_error_solution(error_hash):
    try:
        execute("DELETE FROM error_solutions WHERE error_hash = %s", (error_hash,))
        return make_response("", 204)
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN (users + retention) — requires admin token
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/users", methods=["GET"])
def list_users():
    _, err = require_role("admin")
    if err:
        return err
    try:
        rows = query("SELECT * FROM users ORDER BY created_at DESC")
        rows = [{k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in r.items()} for r in rows]
        return jsonify(rows)
    except Exception:
        return jsonify([])  # table may not exist


@app.route("/api/users", methods=["POST"])
def create_user():
    _, err = require_role("admin")
    if err:
        return err
    body = request.get_json() or {}
    try:
        row = execute_returning(
            "INSERT INTO users (id, email, role, oauth_provider, oauth_subject) "
            "VALUES (%s,%s,%s,%s,%s) RETURNING *",
            (str(uuid.uuid4()), body.get("email"), body.get("role"),
             body.get("oauthProvider"), body.get("oauthSubject")),
        )
        row = {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in row.items()}
        return jsonify(row), 201
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/users/<user_id>", methods=["DELETE"])
def delete_user(user_id):
    _, err = require_role("admin")
    if err:
        return err
    try:
        count = execute("DELETE FROM users WHERE id = %s", (user_id,))
        if count == 0:
            return jsonify({"error": "User not found"}), 404
        return make_response("", 204)
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/retention", methods=["GET"])
def get_retention():
    _, err = require_role("admin")
    if err:
        return err
    try:
        rows = query("SELECT * FROM retention_policies")
        rows = [{k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in r.items()} for r in rows]
        return jsonify(rows)
    except Exception:
        return jsonify([])


@app.route("/api/retention", methods=["PUT"])
def upsert_retention():
    _, err = require_role("admin")
    if err:
        return err
    body = request.get_json() or {}
    app_id = body.get("applicationId")
    days   = body.get("retentionDays")
    try:
        count = execute(
            "UPDATE retention_policies SET retention_days = %s WHERE application_id = %s",
            (days, app_id),
        )
        if count > 0:
            row = query("SELECT * FROM retention_policies WHERE application_id = %s", (app_id,))[0]
        else:
            row = execute_returning(
                "INSERT INTO retention_policies (id, application_id, retention_days) "
                "VALUES (%s,%s,%s) RETURNING *",
                (str(uuid.uuid4()), app_id, days),
            )
        row = {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in row.items()}
        return jsonify(row)
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

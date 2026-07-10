"""
Flask application — all API routes.
Shared between the Lambda handler (lambda_function.py) and local dev.

Architecture: Single-table design
  - projects        → project metadata (id, name, category, is_live)
  - project_results → all logs/errors/results from ALL projects
"""

import os
import uuid
import hashlib
import json
import time
import random
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

#new version check
@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin", "")
    allow_origin = origin if origin in ALLOWED_ORIGINS else "*"
    response.headers["Access-Control-Allow-Origin"] = allow_origin
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-API-Key"
    response.headers["Access-Control-Max-Age"] = "86400"
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


# ── Serialization helper ──────────────────────────────────────────────────────
def serialize_row(row):
    """Convert datetime values to ISO strings for JSON serialization."""
    return {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in row.items()}


def serialize_rows(rows):
    return [serialize_row(r) for r in rows]


# ═══════════════════════════════════════════════════════════════════════════════
# SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "ts": datetime.now(timezone.utc).isoformat()})


@app.route("/api/health/teams")
def health_teams():
    return jsonify(test_teams_webhook())


@app.route("/api/debug/project-tables")
def debug_project_tables():
    """Debug endpoint — lists all projects from the projects table."""
    rows = query("SELECT name FROM projects ORDER BY name")
    names = [r["name"] for r in rows]
    return jsonify({"tables": names, "count": len(names)})


# ═══════════════════════════════════════════════════════════════════════════════
# PROJECTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/projects")
def list_projects():
    category = request.args.get("category")
    try:
        if category:
            rows = query(
                "SELECT id, name, category FROM projects WHERE category = %s ORDER BY name",
                (category,),
            )
        else:
            rows = query("SELECT id, name, category FROM projects ORDER BY name")
        return jsonify(serialize_rows(rows))
    except Exception as e:
        print(f"[Projects] error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/projects/live")
def list_live_projects():
    try:
        rows = query(
            "SELECT id, name, category, is_live FROM projects WHERE is_live = true ORDER BY name"
        )
        return jsonify(serialize_rows(rows))
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/projects/<path:name>/logs")
def project_logs(name):
    project_name = name
    try:
        # Check if project exists
        proj = query(
            "SELECT name FROM projects WHERE LOWER(name) = LOWER(%s)",
            (project_name,),
        )
        if not proj:
            return jsonify({
                "exists": False, "tableName": project_name.replace(" ", "_"),
                "total": 0, "filesProcessed": 0, "success": 0, "failure": 0,
                "totalCost": None, "errors": [], "logs": [],
            })

        actual_name = proj[0]["name"]
        logs = query(
            "SELECT file_name, timestamp, success_count, failure_count, error, "
            "llm_usage, input_tokens, output_tokens, calculated_cost, word_count, file_type, "
            "error_status, resolved_at, reopened_at "
            "FROM project_results WHERE LOWER(project_name) = LOWER(%s) "
            "ORDER BY timestamp DESC LIMIT 500",
            (actual_name,),
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
        visible_logs = serialize_rows(visible_logs)
        errors = serialize_rows(errors)
        return jsonify({
            "exists": True, "tableName": actual_name.replace(" ", "_"),
            "total": total, "filesProcessed": total,
            "success": success, "failure": failure,
            "totalCost": total_cost, "errors": errors, "logs": visible_logs,
        })
    except Exception as e:
        print(f"[Projects] logs error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/projects/<path:name>/errors", methods=["POST"])
def upsert_project_error(name):
    project_name = name
    try:
        # Verify project exists
        proj = query(
            "SELECT name FROM projects WHERE LOWER(name) = LOWER(%s)",
            (project_name,),
        )
        if not proj:
            return jsonify({"error": f"No project found: {project_name}"}), 404
        actual_name = proj[0]["name"]

        body = request.get_json() or {}
        file_name = str(body.get("file_name", ""))
        error_detail = (body.get("error_detail") or "").strip() or None
        short_error = str(body.get("error", "")).strip()

        if error_detail:
            lines = [l.strip() for l in error_detail.split("\n") if l.strip()]
            if lines:
                derived = lines[-1].split(":")[0].strip()
                if derived:
                    short_error = derived

        if not short_error:
            return jsonify({"error": "error or error_detail is required"}), 400

        error_hash = hashlib.md5(short_error.lower().strip().encode()).hexdigest()

        # Try to update existing row with same error_hash
        updated = execute_returning(
            "UPDATE project_results SET failure_count = failure_count + 1, file_name = %s, "
            "timestamp = NOW(), error_detail = COALESCE(%s, error_detail), "
            "error_status = CASE WHEN error_status = 'resolved' THEN 'reopened' ELSE error_status END, "
            "reopened_at = CASE WHEN error_status = 'resolved' THEN NOW() ELSE reopened_at END, "
            "resolved_at = CASE WHEN error_status = 'resolved' THEN NULL ELSE resolved_at END "
            "WHERE error_hash = %s AND LOWER(project_name) = LOWER(%s) "
            "RETURNING id, error_status, failure_count",
            (file_name, error_detail, error_hash, actual_name),
        )
        if updated:
            action = "reopened" if updated["error_status"] == "reopened" else "updated"
            return jsonify({"action": action, "error_status": updated["error_status"],
                            "failure_count": updated["failure_count"]})

        # Insert new error row
        inserted = execute_returning(
            "INSERT INTO project_results (id, project_name, file_name, timestamp, "
            "success_count, failure_count, error, error_detail, error_hash, error_status) "
            "VALUES (%s, %s, %s, NOW(), 0, 1, %s, %s, %s, 'open') "
            "RETURNING id, error_status, failure_count",
            (str(uuid.uuid4()), actual_name, file_name, short_error, error_detail, error_hash),
        )
        return jsonify({"action": "inserted", "error_status": inserted["error_status"],
                        "failure_count": inserted["failure_count"]})
    except Exception as e:
        print(f"[Projects] upsert error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/projects/<path:name>/errors/<hash>/resolve", methods=["PATCH"])
def resolve_project_error(name, hash):
    try:
        proj = query(
            "SELECT name FROM projects WHERE LOWER(name) = LOWER(%s)",
            (name,),
        )
        if not proj:
            return jsonify({"error": f"No project found: {name}"}), 404
        actual_name = proj[0]["name"]
        execute(
            "UPDATE project_results SET error_status = %s, resolved_at = NOW(), "
            "reopened_at = NULL WHERE error_hash = %s AND LOWER(project_name) = LOWER(%s)",
            ("resolved", hash, actual_name),
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
        row = execute_returning(
            "UPDATE projects SET is_live = %s WHERE LOWER(name) = LOWER(%s) "
            "RETURNING id, name, category, is_live",
            (is_live, name),
        )
        if not row:
            return jsonify({"error": f"Project not found: {name}"}), 404
        return jsonify(serialize_row(row))
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# INGEST
# ═══════════════════════════════════════════════════════════════════════════════

def _insert_result(project_name, file_name, error, error_detail,
                   error_hash, error_status, success_count, failure_count,
                   word_count, file_type, input_tokens, output_tokens,
                   calculated_cost, llm_usage):
    """Insert a row into project_results and return it."""
    row_id = str(uuid.uuid4())
    return execute_returning(
        "INSERT INTO project_results ("
        "id, project_name, file_name, timestamp, "
        "success_count, failure_count, error, error_detail, error_hash, error_status, "
        "word_count, file_type, input_tokens, output_tokens, calculated_cost, llm_usage"
        ") VALUES (%s,%s,%s,NOW(),%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) "
        "RETURNING id, project_name, file_name, error, error_detail, "
        "error_hash, error_status, success_count, failure_count, timestamp",
        (row_id, project_name, file_name,
         success_count, failure_count, error, error_detail,
         error_hash, error_status,
         word_count, file_type, input_tokens, output_tokens,
         calculated_cost, llm_usage),
    )


def _to_int(value):
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        try:
            return int(float(value))
        except ValueError:
            return None
    return None


def _to_float(value):
    if isinstance(value, (float, int)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return None
    return None


def _lookup_usage_field(source, keys):
    if not isinstance(source, dict):
        return None
    for key in keys:
        if key in source:
            return source[key]
    return None


def _normalize_usage(source):
    if not isinstance(source, dict):
        return {}

    data = {}
    # Token counts
    data["input_tokens"] = _to_int(_lookup_usage_field(source, ["prompt_tokens", "input_tokens", "input", "input_token_count", "tokens_in", "promptTokenCount"]))
    data["output_tokens"] = _to_int(_lookup_usage_field(source, ["completion_tokens", "output_tokens", "output", "output_token_count", "tokens_out", "completionTokenCount"]))
    data["calculated_cost"] = _to_float(_lookup_usage_field(source, ["cost", "total_cost", "usd_cost", "price", "estimated_cost", "currency_cost"]))
    data["llm_usage"] = source.get("llm_usage") or source.get("provider") or source.get("model")
    return data


def _extract_usage(body):
    if not isinstance(body, dict):
        return {}

    extracted = {
        "input_tokens": None,
        "output_tokens": None,
        "calculated_cost": None,
        "llm_usage": None,
    }

    # Direct values first
    extracted["input_tokens"] = _to_int(body.get("input_tokens"))
    extracted["output_tokens"] = _to_int(body.get("output_tokens"))
    extracted["calculated_cost"] = _to_float(body.get("calculated_cost"))
    extracted["llm_usage"] = body.get("llm_usage") or body.get("model") or body.get("provider")

    candidates = []
    if isinstance(body.get("usage"), dict):
        candidates.append(body["usage"])
    elif isinstance(body.get("usage"), str):
        try:
            parsed = json.loads(body["usage"])
            if isinstance(parsed, dict):
                candidates.append(parsed)
        except Exception:
            pass

    for key in ("response", "result", "data", "metadata", "response_metadata", "output", "completion"):
        value = body.get(key)
        if isinstance(value, dict):
            candidates.append(value)
            if isinstance(value.get("usage"), dict):
                candidates.append(value["usage"])

    for source in candidates:
        if extracted["input_tokens"] is None:
            extracted["input_tokens"] = _normalize_usage(source).get("input_tokens")
        if extracted["output_tokens"] is None:
            extracted["output_tokens"] = _normalize_usage(source).get("output_tokens")
        if extracted["calculated_cost"] is None:
            extracted["calculated_cost"] = _normalize_usage(source).get("calculated_cost")
        if extracted["llm_usage"] is None:
            extracted["llm_usage"] = _normalize_usage(source).get("llm_usage")

    if extracted["input_tokens"] is None and extracted["output_tokens"] is None:
        total_tokens = _to_int(_lookup_usage_field(body, ["total_tokens", "tokens", "total"]))
        if total_tokens is not None:
            extracted["input_tokens"] = total_tokens

    return extracted


def _parse_optional(body):
    extracted = _extract_usage(body)
    return {
        "file_name":       body.get("file_name") or None,
        "error_detail":    body.get("error_detail") or None,
        "success_count":   body.get("success_count", 0),
        "failure_count":   body.get("failure_count", 1),
        "word_count":      body.get("word_count"),
        "file_type":       body.get("file_type"),
        "input_tokens":    body.get("input_tokens") if body.get("input_tokens") is not None else extracted.get("input_tokens"),
        "output_tokens":   body.get("output_tokens") if body.get("output_tokens") is not None else extracted.get("output_tokens"),
        "calculated_cost": body.get("calculated_cost") if body.get("calculated_cost") is not None else extracted.get("calculated_cost"),
        "llm_usage":       body.get("llm_usage") or extracted.get("llm_usage"),
    }


def _validate_project(project_name):
    """Return actual project name if found, else None."""
    rows = query(
        "SELECT name FROM projects WHERE LOWER(name) = LOWER(%s)",
        (project_name,),
    )
    return rows[0]["name"] if rows else None


@app.route("/api/ingest/error", methods=["POST"])
def ingest_error():
    body = request.get_json() or {}
    project_name = str(body.get("project_name", "")).strip()
    error = str(body.get("error", "")).strip()
    if not project_name:
        return jsonify({"error": "project_name is required"}), 400
    if not error:
        return jsonify({"error": "error is required"}), 400
    if error.startswith("{") and ("workflowId" in error or "workflowStatus" in error):
        return jsonify({"error": "Invalid error value — workflow/system response passed"}), 400

    actual_name = _validate_project(project_name)
    if not actual_name:
        return jsonify({"error": f'No project found: "{project_name}"'}), 404

    opt = _parse_optional(body)
    error_hash = hashlib.md5(
        f'{error.lower().strip()}:{time.time()}:{random.random()}'.encode()
    ).hexdigest()

    try:
        inserted = _insert_result(
            actual_name, opt["file_name"], error, opt["error_detail"],
            error_hash, "open",
            opt.get("success_count", 0), opt.get("failure_count", 1),
            opt["word_count"], opt["file_type"], opt["input_tokens"],
            opt["output_tokens"], opt["calculated_cost"], opt["llm_usage"],
        )
        print(f'[Ingest] ❌ Error row → "{actual_name}" | {error}')
        send_teams_alert("Error Ingest", "New Error", actual_name, error,
                         error_detail=opt["error_detail"])
        row = serialize_row(inserted)
        return jsonify({"success": True, "type": "error", **row}), 201
    except Exception as e:
        print(f"[Ingest] error: {e}")
        return jsonify({"error": "Internal server error", "detail": str(e)}), 500


@app.route("/api/ingest/log", methods=["POST"])
def ingest_log():
    body = request.get_json() or {}
    project_name = str(body.get("project_name", "")).strip()
    if not project_name:
        return jsonify({"error": "project_name is required"}), 400

    actual_name = _validate_project(project_name)
    if not actual_name:
        return jsonify({"error": f'No project found: "{project_name}"'}), 404

    opt = _parse_optional(body)
    error = str(body.get("error", "")).strip()
    is_workflow = error.startswith("{") and ("workflowId" in error or "workflowStatus" in error)
    is_error = bool(error) and not is_workflow

    error_hash = (
        hashlib.md5(f'{error.lower().strip()}:{time.time()}:{random.random()}'.encode()).hexdigest()
        if is_error else None
    )
    success_count = body.get("success_count", 0 if is_error else 1)
    failure_count = body.get("failure_count", 1 if is_error else 0)

    try:
        inserted = _insert_result(
            actual_name, opt["file_name"],
            error if is_error else None, opt["error_detail"],
            error_hash, "open" if is_error else None,
            success_count, failure_count,
            opt["word_count"], opt["file_type"], opt["input_tokens"],
            opt["output_tokens"], opt["calculated_cost"], opt["llm_usage"],
        )
        t = "error" if is_error else "success"
        print(f'[Ingest] {"❌" if is_error else "✅"} {t} row → "{actual_name}"')
        if is_error:
            send_teams_alert("Log Ingest", "New Error", actual_name, error,
                             error_detail=opt["error_detail"])
        row = serialize_row(inserted)
        return jsonify({"success": True, "type": t, **row}), 201
    except Exception as e:
        print(f"[Ingest] log error: {e}")
        return jsonify({"error": "Internal server error", "detail": str(e)}), 500


@app.route("/api/ingest/success", methods=["POST"])
def ingest_success():
    body = request.get_json() or {}
    project_name = str(body.get("project_name", "")).strip()
    if not project_name:
        return jsonify({"error": "project_name is required"}), 400

    actual_name = _validate_project(project_name)
    if not actual_name:
        return jsonify({"error": f'No project found: "{project_name}"'}), 404

    opt = _parse_optional(body)
    success_count = body.get("success_count", 1)

    try:
        inserted = _insert_result(
            actual_name, opt["file_name"],
            None, None, None, None,
            success_count, 0,
            opt["word_count"], opt["file_type"], opt["input_tokens"],
            opt["output_tokens"], opt["calculated_cost"], opt["llm_usage"],
        )
        row = serialize_row(inserted)
        return jsonify({"success": True, "type": "success", **row}), 201
    except Exception as e:
        return jsonify({"error": "Internal server error", "detail": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/dashboard/top-projects")
def dashboard_top_projects():
    try:
        rows = query("""
            SELECT pr.project_name, CAST(COUNT(*) AS int) AS total
            FROM project_results pr
            JOIN projects p ON LOWER(p.name) = LOWER(pr.project_name)
            GROUP BY pr.project_name
            ORDER BY total DESC LIMIT 10
        """)
        return jsonify({"projects": serialize_rows(rows)})
    except Exception as e:
        print(f"[Dashboard] top-projects: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/dashboard/top-error-projects")
def dashboard_top_error_projects():
    try:
        rows = query("""
            SELECT pr.project_name, CAST(COUNT(*) AS int) AS total
            FROM project_results pr
            JOIN projects p ON LOWER(p.name) = LOWER(pr.project_name)
            WHERE pr.error IS NOT NULL AND pr.error <> ''
              AND pr.error_status IN ('open', 'reopened')
            GROUP BY pr.project_name
            HAVING COUNT(*) > 0
            ORDER BY total DESC LIMIT 10
        """)
        return jsonify({"projects": serialize_rows(rows)})
    except Exception as e:
        print(f"[Dashboard] top-error-projects: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/dashboard/today-errors")
def dashboard_today_errors():
    try:
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        rows = query("""
            SELECT pr.project_name AS project, pr.file_name, pr.error,
                   pr.error_detail, pr.error_hash, pr.timestamp
            FROM project_results pr
            JOIN projects p ON LOWER(p.name) = LOWER(pr.project_name)
            WHERE pr.error IS NOT NULL AND pr.error <> ''
              AND pr.error_status IN ('open', 'reopened')
              AND (
                (pr.timestamp AT TIME ZONE 'UTC' >= CURRENT_DATE
                 AND pr.timestamp AT TIME ZONE 'UTC' < CURRENT_DATE + INTERVAL '1 day')
                OR
                (pr.reopened_at IS NOT NULL
                 AND pr.reopened_at AT TIME ZONE 'UTC' >= CURRENT_DATE
                 AND pr.reopened_at AT TIME ZONE 'UTC' < CURRENT_DATE + INTERVAL '1 day')
              )
            ORDER BY pr.timestamp DESC
        """)
        return jsonify({"date": date_str, "errors": serialize_rows(rows)})
    except Exception as e:
        print(f"[Dashboard] today-errors: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/dashboard/errors")
def dashboard_errors():
    from_ts = request.args.get("from", "")
    to_ts = request.args.get("to", "")
    try:
        conditions = [
            "pr.error IS NOT NULL", "pr.error <> ''",
            "pr.error_status IN ('open', 'reopened')",
        ]
        params = []
        idx = 1

        if from_ts:
            conditions.append(f"pr.timestamp >= %s")
            params.append(from_ts)
        if to_ts:
            conditions.append(f"pr.timestamp <= %s")
            params.append(to_ts)

        where = " AND ".join(conditions)
        rows = query(
            f"SELECT pr.project_name AS project, pr.file_name, pr.error, "
            f"pr.error_detail, pr.error_hash, pr.timestamp "
            f"FROM project_results pr "
            f"JOIN projects p ON LOWER(p.name) = LOWER(pr.project_name) "
            f"WHERE {where} "
            f"ORDER BY pr.timestamp DESC LIMIT 2000",
            params if params else None,
        )
        return jsonify({"errors": serialize_rows(rows)})
    except Exception as e:
        print(f"[Dashboard] errors: {e}")
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# BREAKS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/breaks/grouped")
def breaks_grouped():
    page = max(1, int(request.args.get("page", 1) or 1))
    limit = min(100, max(1, int(request.args.get("limit", 20) or 20)))
    status_f = request.args.get("status", "")
    project_f = request.args.get("project", "")
    from_ts = request.args.get("from", "")
    to_ts = request.args.get("to", "")

    try:
        conditions = [
            "pr.error IS NOT NULL", "pr.error <> ''",
            "pr.error_status IN ('open', 'reopened')",
        ]
        params = []

        if from_ts:
            conditions.append("pr.timestamp >= %s")
            params.append(from_ts)
        if to_ts:
            conditions.append("pr.timestamp <= %s")
            params.append(to_ts)
        if project_f:
            conditions.append("LOWER(pr.project_name) = LOWER(%s)")
            params.append(project_f)

        where = " AND ".join(conditions)

        grouped_sql = (
            f"SELECT pr.project_name, "
            f"pr.error AS error_message, "
            f"COALESCE(pr.error_hash, MD5(LOWER(TRIM(pr.error)))) AS error_hash, "
            f"SUM(pr.failure_count)::int AS occurrence_count, "
            f"MIN(pr.timestamp) AS first_seen, "
            f"COALESCE(MAX(pr.reopened_at), MAX(pr.timestamp)) AS last_seen, "
            f"CASE "
            f"  WHEN BOOL_OR(pr.error_status = 'reopened') THEN 'regression' "
            f"  WHEN SUM(pr.failure_count) = 1 THEN 'new' "
            f"  ELSE 'existing' "
            f"END AS status "
            f"FROM project_results pr "
            f"JOIN projects p ON LOWER(p.name) = LOWER(pr.project_name) "
            f"WHERE {where} "
            f"GROUP BY pr.project_name, pr.error, COALESCE(pr.error_hash, MD5(LOWER(TRIM(pr.error))))"
        )

        # Apply status filter on the grouped result
        outer_conditions = []
        outer_params = []
        if status_f:
            outer_conditions.append("status = %s")
            outer_params.append(status_f)

        outer_where = f"WHERE {' AND '.join(outer_conditions)}" if outer_conditions else ""

        # Count total
        count_sql = f"SELECT COUNT(*) AS cnt FROM ({grouped_sql}) AS g {outer_where}"
        total_rows = query(count_sql, params + outer_params if (params or outer_params) else None)
        total = int(total_rows[0]["cnt"]) if total_rows else 0

        # Paginated data
        offset = (page - 1) * limit
        data_sql = (
            f"SELECT * FROM ({grouped_sql}) AS g {outer_where} "
            f"ORDER BY last_seen DESC NULLS LAST LIMIT %s OFFSET %s"
        )
        all_params = params + outer_params + [limit, offset]
        data = query(data_sql, all_params)
        return jsonify({"data": serialize_rows(data), "total": total, "page": page, "limit": limit})
    except Exception as e:
        print(f"[Breaks] grouped error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/breaks/<break_id>")
def get_break(break_id):
    """
    GET /api/breaks/:id
    Returns break detail with correlatedLogs: []
    """
    try:
        rows = query("SELECT * FROM breaks WHERE id = %s", (break_id,))
        if not rows:
            return jsonify({"error": "Not Found", "message": "Break not found."}), 404
        row = serialize_row(rows[0])
        row["correlatedLogs"] = []
        return jsonify(row)
    except Exception:
        return jsonify({"error": "Not Found", "message": "Break not found."}), 404


@app.route("/api/breaks/detail/<error_hash>")
def get_break_detail(error_hash):
    """
    GET /api/breaks/detail/:error_hash
    Returns full error detail for the Error Details page:
      - project_name, error_message, error_detail (stack trace), error_hash
      - occurrence_count, first_seen, last_seen, status
      - All occurrence rows (file_name, timestamp)
      - Saved solution (if any)
    """
    try:
        project_name = (request.args.get('project_name') or '').strip() or None

        # Get grouped error info
        conditions = [
            "(error_hash = %s OR MD5(LOWER(TRIM(error))) = %s)",
            "error IS NOT NULL",
            "error <> ''",
        ]
        params = [error_hash, error_hash]
        if project_name:
            conditions.insert(0, "LOWER(project_name) = LOWER(%s)")
            params.insert(0, project_name)

        error_rows = query(
            "SELECT project_name, error AS error_message, error_detail, error_hash, "
            "failure_count, timestamp, error_status, reopened_at, file_name "
            "FROM project_results "
            f"WHERE {' AND '.join(conditions)} "
            "ORDER BY timestamp DESC",
            tuple(params),
        )
        if not error_rows:
            return jsonify({"error": "Not Found", "message": "Error not found."}), 404

        first = error_rows[0]
        occurrence_count = sum(r.get("failure_count", 1) for r in error_rows)
        first_seen = min(r["timestamp"] for r in error_rows if r.get("timestamp"))
        last_seen = max(r.get("reopened_at") or r["timestamp"] for r in error_rows if r.get("timestamp"))
        file_name = next((r.get("file_name") for r in error_rows if r.get("file_name")), first.get("file_name"))

        has_reopened = any(r.get("error_status") == "reopened" for r in error_rows)
        if has_reopened:
            status = "regression"
        elif occurrence_count == 1:
            status = "new"
        else:
            status = "existing"

        occurrences = [
            {"file_name": r.get("file_name"), "timestamp": r["timestamp"], "failure_count": r.get("failure_count", 1)}
            for r in error_rows
        ]

        # Get latest solution from knowledge_base
        solution_conditions = [
            "(pr.error_hash = %s OR MD5(LOWER(TRIM(pr.error))) = %s)"
        ]
        solution_params = [error_hash, error_hash]
        if project_name:
            solution_conditions.insert(0, "LOWER(pr.project_name) = LOWER(%s)")
            solution_params.insert(0, project_name)

        solution_rows = query(
            f"""
            SELECT kb.solution,
                kb.created_at,
                kb.created_by
            FROM knowledge_base kb
            JOIN project_results pr
            ON kb.project_result_id = pr.id
            WHERE {' AND '.join(solution_conditions)}
            ORDER BY kb.created_at DESC
            LIMIT 1
            """,
            tuple(solution_params),
        )

        solution_data = None

        if solution_rows:
            s = solution_rows[0]
            solution_data = {
                "solution": s["solution"],
                "created_at": s["created_at"].isoformat() if s.get("created_at") else None,
                "created_by": s.get("created_by"),
            }

        result = {
            "project_name": first["project_name"],
            "file_name": file_name,
            "error_message": first["error_message"],
            "error_detail": first.get("error_detail"),
            "error_hash": error_hash,
            "occurrence_count": occurrence_count,
            "first_seen": first_seen,
            "status": status,
            "occurrences": serialize_rows(occurrences),
            "solution": solution_data,
        }
        return jsonify(serialize_row(result))
    except Exception as e:
        print(f"[Breaks] detail error: {e}")
        return jsonify({"error": "Internal server error"}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# LEGACY DASHBOARD (GET /api/dashboard — used by useDashboard.ts hook)
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/dashboard")
def dashboard_legacy():
    """
    GET /api/dashboard
    Returns aggregated break counts, trend, top services, etc.
    Falls back to empty data if the breaks table doesn't exist.
    """
    try:
        def safe_count(sql):
            try:
                r = query(sql)
                return int(r[0]["count"]) if r else 0
            except Exception:
                return 0

        last24h = safe_count(
            "SELECT COUNT(*) AS count FROM breaks WHERE timestamp >= NOW() - INTERVAL '24 hours'"
        )
        last7d = safe_count(
            "SELECT COUNT(*) AS count FROM breaks WHERE timestamp >= NOW() - INTERVAL '7 days'"
        )

        return jsonify({
            "breakCounts": {"last24h": last24h, "last7d": last7d},
            "errorRateTrend": [],
            "topServices": [],
            "timeSeries": [],
            "severityBreakdown": [],
            "deploymentEvents": [],
            "airbrakeUnreachable": False,
        })
    except Exception:
        return jsonify({
            "breakCounts": {"last24h": 0, "last7d": 0},
            "errorRateTrend": [],
            "topServices": [],
            "timeSeries": [],
            "severityBreakdown": [],
            "deploymentEvents": [],
            "airbrakeUnreachable": True,
        })


# ═══════════════════════════════════════════════════════════════════════════════
# ALERT RULES & HISTORY
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/alert-rules", methods=["GET"])
def get_alert_rules():
    try:
        rows = query(
            "SELECT id, rule_name, project_name, alert_type, threshold, "
            "window_minutes, is_active, created_at FROM alert_rules ORDER BY created_at DESC"
        )
        return jsonify(serialize_rows(rows))
    except Exception:
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
        return jsonify(serialize_row(row)), 201
    except Exception:
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
        return jsonify(serialize_row(row))
    except Exception:
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
        return jsonify(serialize_row(row))
    except Exception:
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/alert-rules/<rule_id>", methods=["DELETE"])
def delete_alert_rule(rule_id):
    try:
        count = execute("DELETE FROM alert_rules WHERE id=%s", (rule_id,))
        if count == 0:
            return jsonify({"error": "Rule not found"}), 404
        return make_response("", 204)
    except Exception:
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/alert-history")
def get_alert_history():
    conditions, values = [], []
    if request.args.get("project"):
        conditions.append("h.project_name = %s")
        values.append(request.args["project"])
    if request.args.get("alert_type"):
        conditions.append("h.alert_type = %s")
        values.append(request.args["alert_type"])
    if request.args.get("from"):
        conditions.append("h.triggered_at >= %s")
        values.append(request.args["from"])
    if request.args.get("to"):
        conditions.append("h.triggered_at <= %s")
        values.append(request.args["to"])
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    try:
        rows = query(
            f"SELECT h.id, h.rule_id, r.rule_name, h.project_name, h.error, "
            f"h.alert_type, h.triggered_at FROM alert_history h "
            f"LEFT JOIN alert_rules r ON r.id = h.rule_id {where} "
            f"ORDER BY h.triggered_at DESC",
            values if values else None,
        )
        return jsonify(serialize_rows(rows))
    except Exception:
        return jsonify({"error": "Internal server error"}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# ERROR SOLUTIONS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/knowledge_base/resolve", methods=["POST"])
def resolve_error_solution():
    body = request.get_json() or {}
    error_hash = body.get("error_hash")
    project_name = body.get("project_name")
    if not error_hash or not project_name:
        return jsonify({"error": "error_hash and project_name are required"}), 400
    try:
        count = execute(
            "UPDATE project_results SET error_status = 'resolved', resolved_at = NOW() "
            "WHERE error_hash = %s AND LOWER(project_name) = LOWER(%s) "
            "AND error_status IN ('open', 'reopened')",
            (error_hash, project_name),
        )
        return jsonify({"resolved": count, "project_name": project_name, "error_hash": error_hash})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/knowledge_base/<error_hash>", methods=["GET"])
def get_error_solution(error_hash):
    try:
        rows = query(
        """
        SELECT kb.solution, kb.created_at
        FROM knowledge_base kb
        JOIN project_results pr
            ON kb.project_result_id = pr.id
        WHERE pr.error_hash = %s
        ORDER BY kb.created_at DESC
        LIMIT 1
        """,
        (error_hash,),
        )
        if not rows:
            return jsonify({"solution": None})
        r = rows[0]
        return jsonify({
            "solution": r["solution"],
            "updated_at": r["created_at"].isoformat() if r.get("created_at") else None,
        })
    except Exception:
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/knowledge_base", methods=["POST"])
def upsert_error_solution():
    body = request.get_json() or {}
    error_hash = body.get("error_hash")
    solution = body.get("solution")
    created_by = body.get("created_by") or "developer"
    if not error_hash:
        return jsonify({"error": "error_hash is required"}), 400
    if not solution:
        return jsonify({"error": "solution is required"}), 400
    try:
        project = query(
            """
            SELECT id
            FROM project_results
            WHERE error_hash = %s
            LIMIT 1
            """,
            (error_hash,),
        )
        if not project:
            return jsonify({"error": "No matching project_result found"}), 404
        project_result_id = project[0]["id"]
        row = execute_returning(
            """
            INSERT INTO knowledge_base
            (
                id,
                project_result_id,
                solution,
                created_by,
                created_at
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                NOW()
            )
            RETURNING *
            """,
            (
                str(uuid.uuid4()),
                project_result_id,
                solution,
                created_by,
            ),
        )
        return jsonify(serialize_row(row)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/knowledge_base/<error_hash>", methods=["DELETE"])
def delete_error_solution(error_hash):
    try:
        execute(
            "DELETE FROM knowledge_base "
            "WHERE project_result_id IN ("
            "  SELECT id FROM project_results WHERE error_hash = %s"
            ")",
            (error_hash,),
        )
        return make_response("", 204)
    except Exception as e:
        print(f"[Knowledge Base] delete error: {e}")
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
        return jsonify(serialize_rows(rows))
    except Exception:
        return jsonify([])


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
        return jsonify(serialize_row(row)), 201
    except Exception:
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
    except Exception:
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/retention", methods=["GET"])
def get_retention():
    _, err = require_role("admin")
    if err:
        return err
    try:
        rows = query("SELECT * FROM retention_policies")
        return jsonify(serialize_rows(rows))
    except Exception:
        return jsonify([])


@app.route("/api/retention", methods=["PUT"])
def upsert_retention():
    _, err = require_role("admin")
    if err:
        return err
    body = request.get_json() or {}
    app_id = body.get("applicationId")
    days = body.get("retentionDays")
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
        return jsonify(serialize_row(row))
    except Exception:
        return jsonify({"error": "Internal server error"}), 500

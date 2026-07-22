"""
Flask application — all API routes.
Shared between the Lambda handler (lambda_function.py) and local dev.

Architecture: Single-table design using DSQL table 'projects_data'
  - row_type = 'project'  → project metadata (name, category, is_live)
  - row_type = 'log'      → all logs/errors/results from ALL projects
  - row_type = 'solution' → AI knowledge base (solution versioning)
  - row_type = 'user'     → user accounts
"""

import os
import uuid
import hashlib
import json
import time
import random
from datetime import datetime, timezone
from flask import Flask, request, jsonify, make_response, g

try:
    from db import query, execute, execute_returning
except Exception as _db_exc:  # pragma: no cover - import safety
    import traceback as _db_tb_mod
    _db_import_error = _db_exc
    _db_import_tb = _db_tb_mod.format_exc()
    print(f"[app] WARNING: db import failed — using degraded stubs: {type(_db_exc).__name__}: {_db_exc}")
    print(_db_import_tb)

    def query(*args, **kwargs):
        raise RuntimeError(f"Database unavailable — component=db error={type(_db_import_error).__name__}: {_db_import_error}")

    def execute(*args, **kwargs):
        raise RuntimeError(f"Database unavailable — component=db error={type(_db_import_error).__name__}: {_db_import_error}")

    def execute_returning(*args, **kwargs):
        raise RuntimeError(f"Database unavailable — component=db error={type(_db_import_error).__name__}: {_db_import_error}")
else:
    _db_import_error = None
    _db_import_tb = ""

try:
    from ai.diagnostics import get_ai_diagnostics
except Exception as exc:  # pragma: no cover - import safety
    def get_ai_diagnostics():
        return {"status": "error", "error": f"{type(exc).__name__}: {exc}"}

try:
    from ai.error_matching import build_error_hash_candidates, build_lookup_hash_candidates, derive_error_hash, normalize_project_name
except Exception as exc:  # pragma: no cover - import safety
    def build_error_hash_candidates(error_text, error_detail=None):
        return []

    def build_lookup_hash_candidates(error_hash, error_text=None, error_detail=None):
        return [str(error_hash)] if error_hash else []

    def derive_error_hash(error_text, error_detail=None):
        return hashlib.md5((error_detail or error_text or '').strip().lower().encode('utf-8')).hexdigest()

    def normalize_project_name(project_name):
        return (project_name or '').strip().lower().replace('_', ' ')

# ── Knowledge base functions (DB only, no AI runtime required) ────────────────
# These are always imported directly — they handle AI runtime failures internally.
KB_AVAILABLE = False
_kb_import_err = None          # always defined — stubs reference this safely
_kb_import_tb  = ""

try:
    from ai.knowledge_base import (
        delete_solution_version,
        get_solution_versions,
        get_top_solutions,
        increment_usage,
        insert_solution,
    )
    KB_AVAILABLE = True
except Exception as _e:
    import traceback as _tb_mod
    _kb_import_err = _e
    _kb_import_tb  = _tb_mod.format_exc()
    print(f"[app] CRITICAL: knowledge_base import failed — {type(_e).__name__}: {_e}")
    print(_kb_import_tb)

    def insert_solution(*a, **kw):
        raise RuntimeError(
            f"Knowledge Base unavailable — {type(_kb_import_err).__name__}: {_kb_import_err}"
        )
    def increment_usage(*a, **kw):
        raise RuntimeError(
            f"Knowledge Base unavailable — {type(_kb_import_err).__name__}: {_kb_import_err}"
        )
    def get_top_solutions(*a, **kw): return [], 0
    def get_solution_versions(*a, **kw): return []
    def delete_solution_version(*a, **kw): return 0

# ── AI recommendation (requires Bedrock/LLM at runtime, gracefully disabled) ───
AI_RECOMMENDATIONS_AVAILABLE = False
try:
    from ai.recommendations import get_ai_recommendations
    AI_RECOMMENDATIONS_AVAILABLE = True
except Exception as _ai_import_err:
    print(f"[app] WARNING: AI recommendations import failed — recommendations disabled: {_ai_import_err}")
    def get_ai_recommendations(*a, **kw):
        return {"recommendation": None, "solutions": [], "error": str(_ai_import_err)}

app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False


@app.before_request
def attach_request_context():
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    g.request_id = request_id
    g.request_started_at = time.monotonic()
    print(f"[req:{request_id}] {request.method} {request.path}")


@app.errorhandler(Exception)
def handle_unexpected_error(exc):
    import traceback as _tb_mod
    tb_str = _tb_mod.format_exc()
    print(f"[app] Unhandled exception — {type(exc).__name__}: {exc}")
    print(tb_str)
    return jsonify({
        "error": "Internal server error",
        "exception": type(exc).__name__,
        "message": str(exc),
        "traceback": tb_str,
    }), 500

# The single DSQL table used for ALL data
TABLE = "projects_data"

# ── CORS ──────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = {
    "http://airbrake.s3-website-us-east-1.amazonaws.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
    "http://localhost:3005",
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
    if hasattr(g, "request_started_at"):
        elapsed_ms = (time.monotonic() - g.request_started_at) * 1000
        print(f"[req:{getattr(g, 'request_id', 'n/a')}] completed status={response.status_code} elapsed_ms={elapsed_ms:.2f}")
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
import decimal as _decimal


def _safe_value(v):
    """Convert non-JSON-serializable DB values to safe Python primitives."""
    if isinstance(v, datetime):
        return v.isoformat()
    if isinstance(v, _decimal.Decimal):
        return float(v)
    if isinstance(v, (bytes, bytearray)):
        return v.decode("utf-8", errors="replace")
    if isinstance(v, (str, int, float, bool)) or v is None:
        return v
    if isinstance(v, (list, dict)):
        return v
    return str(v)


def serialize_row(row):
    """Convert DB row values to JSON-serializable Python primitives."""
    return {k: _safe_value(v) for k, v in row.items()}


def serialize_rows(rows):
    return [serialize_row(r) for r in rows]


def _resolve_project_name(project_name):
    if not project_name:
        return None
    candidate = str(project_name).strip()
    if not candidate:
        return None
    rows = query(
        f"SELECT project_name AS name FROM {TABLE} WHERE row_type = 'project' ORDER BY project_name"
    )
    for row in rows:
        if normalize_project_name(row.get("name")) == normalize_project_name(candidate):
            return row.get("name")
    return candidate


# ═══════════════════════════════════════════════════════════════════════════════
# SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "ts": datetime.now(timezone.utc).isoformat()})


@app.route("/api/debug/project-tables")
def debug_project_tables():
    """Debug endpoint — lists all projects from project_data."""
    rows = query(
        f"SELECT project_name AS name FROM {TABLE} WHERE row_type = 'project' ORDER BY project_name"
    )
    names = [r["name"] for r in rows]
    return jsonify({"tables": names, "count": len(names)})


@app.route("/api/debug/columns")
def debug_columns():
    """Debug endpoint — lists all columns in projects_data."""
    rows = query("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'projects_data'
        ORDER BY ordinal_position
    """)
    return jsonify({"columns": [r["column_name"] for r in rows], "count": len(rows)})


@app.route("/api/debug/kb-status")
def debug_kb_status():
    """Debug endpoint — shows Knowledge Base and AI import status.
    Visible directly in browser: GET /api/debug/kb-status
    """
    return jsonify({
        "kb_available": KB_AVAILABLE,
        "ai_recommendations_available": AI_RECOMMENDATIONS_AVAILABLE,
        "kb_import_error": str(_kb_import_err) if _kb_import_err else None,
        "kb_import_traceback": _kb_import_tb if _kb_import_tb else None,
        "db_import_error": str(_db_import_error) if _db_import_error else None,
        "db_import_traceback": _db_import_tb if _db_import_tb else None,
        "ai_health": get_ai_diagnostics(),
    })


@app.route("/api/debug/ai-health")
def debug_ai_health():
    """Lightweight diagnostic endpoint for Bedrock, Pinecone, Aurora, and imports."""
    try:
        return jsonify(get_ai_diagnostics())
    except Exception as exc:
        import traceback as _tb_mod
        return jsonify({
            "status": "error",
            "bedrock": {"connected": False, "model": None, "embedding_dimension": None},
            "pinecone": {"connected": False, "index": None, "namespace": None, "record_count": None, "last_error": f"{type(exc).__name__}: {exc}"},
            "aurora": {"connected": False},
            "environment": {"region": None, "embedding_model": None, "nova_model": None, "pinecone_index": None},
            "error": f"{type(exc).__name__}: {exc}",
            "traceback": _tb_mod.format_exc(),
        })


# ═══════════════════════════════════════════════════════════════════════════════
# PROJECTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/projects")
def list_projects():
    category = request.args.get("category")
    try:
        if category:
            rows = query(
                f"SELECT id, project_name AS name, category FROM {TABLE} "
                f"WHERE row_type = 'project' AND category = %s ORDER BY project_name",
                (category,),
            )
        else:
            rows = query(
                f"SELECT id, project_name AS name, category FROM {TABLE} "
                f"WHERE row_type = 'project' ORDER BY project_name"
            )
        return jsonify(serialize_rows(rows))
    except Exception as e:
        print(f"[Projects] error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/projects", methods=["POST"])
def create_project():
    """
    POST /api/projects
    Register a new project so it appears in AI Services.

    Body:
      {
        "name":     "my_new_project",   ← required
        "category": "Production",       ← optional, defaults to 'Production'
        "is_live":  true                ← optional, defaults to true
      }

    Returns the created project row.
    If the project already exists, returns the existing row.
    """
    body = request.get_json() or {}
    name = str(body.get("name") or body.get("project_name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    category = str(body.get("category") or "Production").strip()
    is_live  = body.get("is_live", True)
    if not isinstance(is_live, bool):
        is_live = True

    try:
        # Return existing project if it already exists
        existing = query(
            f"SELECT id, project_name AS name, category, is_live FROM {TABLE} "
            f"WHERE row_type = 'project' AND LOWER(project_name) = LOWER(%s)",
            (name,),
        )
        if existing:
            return jsonify(serialize_row(existing[0])), 200

        # Insert new project row
        row = execute_returning(
            f"INSERT INTO {TABLE} (id, row_type, project_name, category, is_live, created_at) "
            f"VALUES (%s, 'project', %s, %s, %s, NOW()) RETURNING id, project_name AS name, category, is_live",
            (str(uuid.uuid4()), name, category, is_live),
        )
        print(f"[Projects] New project registered: '{name}' category='{category}'")
        return jsonify(serialize_row(row)), 201
    except Exception as e:
        print(f"[Projects] create error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/projects/live")
def list_live_projects():
    try:
        rows = query(
            f"SELECT id, project_name AS name, category, is_live FROM {TABLE} "
            f"WHERE row_type = 'project' AND is_live = true ORDER BY project_name"
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
            f"SELECT project_name AS name FROM {TABLE} "
            f"WHERE row_type = 'project' AND LOWER(project_name) = LOWER(%s)",
            (project_name,),
        )
        if not proj:
            return jsonify({
                "exists": False, "tableName": project_name.replace(" ", "_"),
                "total": 0, "filesProcessed": 0, "success": 0, "failure": 0,
                "totalCost": None, "errors": [], "logs": [],
            })

        logs = query(
            f"SELECT file_name, timestamp, success_count, failure_count, error, "
            f"llm_usage, input_tokens, output_tokens, calculated_cost, word_count, file_type, "
            f"error_status, resolved_at, reopened_at "
            f"FROM {TABLE} WHERE row_type = 'log' AND LOWER(project_name) = LOWER(%s) "
            f"ORDER BY timestamp DESC LIMIT 500",
            (project_name,),
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
            "exists": True, "tableName": project_name.replace(" ", "_"),
            "total": total, "filesProcessed": total,
            "success": success, "failure": failure,
            "totalCost": total_cost, "errors": errors, "logs": visible_logs,
        })
    except Exception as e:
        import traceback as _tb
        tb_str = _tb.format_exc()
        request_id = g.get("request_id", "unknown")
        print(f"[req:{request_id}] [Projects:logs] ERROR: {type(e).__name__}: {e}")
        print(f"[req:{request_id}] [Projects:logs] Traceback:\n{tb_str}")
        return jsonify({
            "success": False,
            "exists": False,
            "error": "Failed to load logs",
            "data": [],
            "trace_id": request_id,
            "fallback": True,
        }), 200


@app.route("/api/projects/<path:name>/errors", methods=["POST"])
def upsert_project_error(name):
    project_name = name
    try:
        # Verify project exists
        actual_name = _resolve_project_name(project_name)
        if not actual_name:
            return jsonify({"error": f"No project found: {project_name}"}), 404

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

        error_hash = derive_error_hash(short_error, error_detail)

        # Try to update existing row with same error_hash
        updated = execute_returning(
            f"UPDATE {TABLE} SET failure_count = failure_count + 1, file_name = %s, "
            f"timestamp = NOW(), error_detail = COALESCE(%s, error_detail), "
            f"error_status = CASE WHEN error_status = 'resolved' THEN 'reopened' ELSE error_status END, "
            f"reopened_at = CASE WHEN error_status = 'resolved' THEN NOW() ELSE reopened_at END, "
            f"resolved_at = CASE WHEN error_status = 'resolved' THEN NULL ELSE resolved_at END "
            f"WHERE row_type = 'log' AND error_hash = %s AND LOWER(project_name) = LOWER(%s) "
            f"RETURNING id, error_status, failure_count",
            (file_name, error_detail, error_hash, actual_name),
        )
        if updated:
            action = "reopened" if updated["error_status"] == "reopened" else "updated"
            return jsonify({"action": action, "error_status": updated["error_status"],
                            "failure_count": updated["failure_count"]})

        # Insert new error row
        inserted = execute_returning(
            f"INSERT INTO {TABLE} (id, row_type, project_name, file_name, timestamp, "
            f"success_count, failure_count, error, error_detail, error_hash, error_status) "
            f"VALUES (%s, 'log', %s, %s, NOW(), 0, 1, %s, %s, %s, 'open') "
            f"RETURNING id, error_status, failure_count",
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
        actual_name = _resolve_project_name(name)
        if not actual_name:
            return jsonify({"error": f"No project found: {name}"}), 404
        execute(
            f"UPDATE {TABLE} SET error_status = %s, resolved_at = NOW(), "
            f"reopened_at = NULL WHERE row_type = 'log' AND error_hash = %s "
            f"AND LOWER(project_name) = LOWER(%s)",
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
            f"UPDATE {TABLE} SET is_live = %s "
            f"WHERE row_type = 'project' AND LOWER(project_name) = LOWER(%s) "
            f"RETURNING id, project_name AS name, category, is_live",
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
    """Insert a log row into project_data and return it."""
    row_id = str(uuid.uuid4())
    return execute_returning(
        f"INSERT INTO {TABLE} ("
        f"id, row_type, project_name, file_name, timestamp, "
        f"success_count, failure_count, error, error_detail, error_hash, error_status, "
        f"word_count, file_type, input_tokens, output_tokens, calculated_cost, llm_usage"
        f") VALUES (%s,'log',%s,%s,NOW(),%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) "
        f"RETURNING id, project_name, file_name, error, error_detail, "
        f"error_hash, error_status, success_count, failure_count, timestamp",
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
    """Return actual project name if found. Auto-registers it if it doesn't exist yet."""
    rows = query(
        f"SELECT project_name AS name FROM {TABLE} "
        f"WHERE row_type = 'project' AND LOWER(project_name) = LOWER(%s)",
        (project_name,),
    )
    if rows:
        return rows[0]["name"]

    # Project not found — auto-register it so it appears in AI Services
    print(f"[Projects] Auto-registering new project: '{project_name}'")
    execute_returning(
        f"INSERT INTO {TABLE} (id, row_type, project_name, category, is_live, created_at) "
        f"VALUES (%s, 'project', %s, 'Production', true, NOW()) "
        f"ON CONFLICT DO NOTHING RETURNING project_name",
        (str(uuid.uuid4()), project_name),
    )
    return project_name


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
    opt = _parse_optional(body)
    error_hash = derive_error_hash(error, opt.get("error_detail"))

    try:
        inserted = _insert_result(
            actual_name, opt["file_name"], error, opt["error_detail"],
            error_hash, "open",
            opt.get("success_count", 0), opt.get("failure_count", 1),
            opt["word_count"], opt["file_type"], opt["input_tokens"],
            opt["output_tokens"], opt["calculated_cost"], opt["llm_usage"],
        )
        print(f'[Ingest] ❌ Error row → "{actual_name}" | {error}')
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
    opt = _parse_optional(body)
    error = str(body.get("error", "")).strip()
    is_workflow = error.startswith("{") and ("workflowId" in error or "workflowStatus" in error)
    is_error = bool(error) and not is_workflow

    error_hash = derive_error_hash(error, opt.get("error_detail")) if is_error else None
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
            print(f'[Ingest] ❌ error row → "{actual_name}" | {error}')
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
    from_ts = request.args.get("from", "")
    to_ts = request.args.get("to", "")
    try:
        conditions = ["row_type = 'log'"]
        params = []
        if from_ts:
            conditions.append("timestamp >= %s")
            params.append(from_ts)
        if to_ts:
            conditions.append("timestamp <= %s")
            params.append(to_ts)
        where = "WHERE " + " AND ".join(conditions)
        rows = query(
            f"SELECT project_name, CAST(COUNT(*) AS int) AS total "
            f"FROM {TABLE} {where} "
            f"GROUP BY project_name ORDER BY total DESC LIMIT 10",
            params if params else None,
        )
        return jsonify({"projects": serialize_rows(rows)})
    except Exception as e:
        print(f"[Dashboard] top-projects: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/dashboard/top-error-projects")
def dashboard_top_error_projects():
    from_ts = request.args.get("from", "")
    to_ts = request.args.get("to", "")
    try:
        conditions = [
            "row_type = 'log'",
            "error IS NOT NULL", "error <> ''",
        ]
        params = []
        if from_ts:
            conditions.append("timestamp >= %s")
            params.append(from_ts)
        if to_ts:
            conditions.append("timestamp <= %s")
            params.append(to_ts)
        where = "WHERE " + " AND ".join(conditions)
        rows = query(
            f"SELECT project_name, CAST(COUNT(*) AS int) AS total "
            f"FROM {TABLE} {where} "
            f"GROUP BY project_name HAVING COUNT(*) > 0 "
            f"ORDER BY total DESC LIMIT 10",
            params if params else None,
        )
        return jsonify({"projects": serialize_rows(rows)})
    except Exception as e:
        print(f"[Dashboard] top-error-projects: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/dashboard/today-errors")
def dashboard_today_errors():
    try:
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        rows = query(
            f"SELECT project_name AS project, file_name, error, "
            f"error_detail, error_hash, timestamp "
            f"FROM {TABLE} "
            f"WHERE row_type = 'log' AND error IS NOT NULL AND error <> '' "
            f"AND ("
            f"  (timestamp AT TIME ZONE 'UTC' >= CURRENT_DATE "
            f"   AND timestamp AT TIME ZONE 'UTC' < CURRENT_DATE + INTERVAL '1 day')"
            f"  OR"
            f"  (reopened_at IS NOT NULL "
            f"   AND reopened_at AT TIME ZONE 'UTC' >= CURRENT_DATE "
            f"   AND reopened_at AT TIME ZONE 'UTC' < CURRENT_DATE + INTERVAL '1 day')"
            f") ORDER BY timestamp DESC"
        )
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
            "row_type = 'log'",
            "error IS NOT NULL", "error <> ''",
        ]
        params = []
        if from_ts:
            conditions.append("timestamp >= %s")
            params.append(from_ts)
        if to_ts:
            conditions.append("timestamp <= %s")
            params.append(to_ts)
        where = " AND ".join(conditions)
        rows = query(
            f"SELECT project_name AS project, file_name, error, "
            f"error_detail, error_hash, timestamp "
            f"FROM {TABLE} WHERE {where} "
            f"ORDER BY timestamp DESC LIMIT 2000",
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
            "row_type = 'log'",
            "error IS NOT NULL", "error <> ''",
        ]
        params = []

        if from_ts:
            conditions.append("timestamp >= %s")
            params.append(from_ts)
        if to_ts:
            conditions.append("timestamp <= %s")
            params.append(to_ts)
        if project_f:
            conditions.append("LOWER(project_name) = LOWER(%s)")
            params.append(project_f)

        where = " AND ".join(conditions)

        grouped_sql = (
            f"SELECT project_name, "
            f"error AS error_message, "
            f"COALESCE(error_hash, MD5(LOWER(TRIM(error)))) AS error_hash, "
            f"SUM(failure_count)::int AS occurrence_count, "
            f"MIN(timestamp) AS first_seen, "
            f"GREATEST(MAX(timestamp), MAX(COALESCE(reopened_at, timestamp))) AS last_seen, "
            f"CASE "
            f"  WHEN BOOL_OR(error_status = 'reopened') THEN 'regression' "
            f"  WHEN SUM(failure_count) = 1 THEN 'new' "
            f"  ELSE 'existing' "
            f"END AS status "
            f"FROM {TABLE} WHERE {where} "
            f"GROUP BY project_name, error, COALESCE(error_hash, MD5(LOWER(TRIM(error))))"
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
        return jsonify({
            "error": f"Failed to load grouped breaks: {str(e)}",
            "data": [],
            "total": 0,
            "page": page,
            "limit": limit,
        }), 500


@app.route("/api/breaks/<break_id>")
def get_break(break_id):
    """
    GET /api/breaks/:id — returns break detail with correlatedLogs: []
    """
    try:
        rows = query(
            f"SELECT * FROM {TABLE} WHERE row_type = 'log' AND id = %s",
            (break_id,),
        )
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
    Returns full error detail for the Error Details page.
    """
    try:
        project_name = (request.args.get('project_name') or '').strip() or None

        # Get grouped error info
        conditions = [
            "row_type = 'log'",
            "error IS NOT NULL",
            "error <> ''",
        ]
        params = []
        lookup_hashes = build_lookup_hash_candidates(error_hash, None, None)
        if lookup_hashes:
            hash_clauses = []
            for candidate in lookup_hashes:
                hash_clauses.append("error_hash = %s")
                params.append(candidate)
            hash_clauses.append("COALESCE(error_hash, MD5(LOWER(TRIM(error)))) = %s")
            params.append(error_hash)
            conditions.append(f"({' OR '.join(hash_clauses)})")
        if project_name:
            project_match = normalize_project_name(project_name)
            conditions.append("LOWER(REPLACE(project_name, '_', ' ')) = LOWER(REPLACE(%s, '_', ' '))")
            params.append(project_match)

        error_rows = query(
            "SELECT project_name, error AS error_message, error_detail, error_hash, "
            "failure_count, timestamp, error_status, reopened_at, file_name "
            f"FROM {TABLE} "
            f"WHERE {' AND '.join(conditions)} "
            "ORDER BY timestamp DESC",
            tuple(params),
        )
        if not error_rows:
            return jsonify({"error": "Not Found", "message": "Error not found."}), 404

        first = error_rows[0]
        occurrence_count = sum(r.get("failure_count", 1) for r in error_rows)
        first_seen = min(r["timestamp"] for r in error_rows if r.get("timestamp"))
        last_seen = max(
            max((r["timestamp"] for r in error_rows if r.get("timestamp")), default=None),
            max((r["reopened_at"] for r in error_rows if r.get("reopened_at")), default=None),
        )
        file_name = next((r.get("file_name") for r in error_rows if r.get("file_name")), first.get("file_name"))

        has_reopened = any(r.get("error_status") == "reopened" for r in error_rows)
        if has_reopened:
            status = "regression"
        elif occurrence_count == 1:
            status = "new"
        else:
            status = "existing"

        occurrences = [
            {"file_name": r.get("file_name"), "timestamp": r["timestamp"],
             "failure_count": r.get("failure_count", 1)}
            for r in error_rows
        ]

        # Get latest solution from projects_data (row_type='solution') — isolated so failure
        # does not prevent the rest of Error Details from loading
        solution_data = None
        solution_error = None
        try:
            solution_conditions = [
                "row_type = 'solution'",
                "(error_hash = %s OR error_hash IN ("
                f"  SELECT error_hash FROM {TABLE} WHERE row_type = 'log' "
                f"  AND MD5(LOWER(TRIM(error))) = %s))",
            ]
            solution_params = [error_hash, error_hash]
            if project_name:
                solution_conditions.append("LOWER(project_name) = LOWER(%s)")
                solution_params.append(project_name)

            if error_hash:
                candidate_clauses = []
                for candidate in build_error_hash_candidates(error_hash, None):
                    candidate_clauses.append("error_hash = %s")
                    solution_params.append(candidate)
                if candidate_clauses:
                    solution_conditions[1] = f"({' OR '.join(candidate_clauses)})"

            solution_rows = query(
                f"SELECT id, solution, created_at, created_by, version, confidence_score, usage_count "
                f"FROM {TABLE} WHERE {' AND '.join(solution_conditions)} "
                f"ORDER BY created_at DESC LIMIT 1",
                tuple(solution_params),
            )
            if solution_rows:
                s = solution_rows[0]
                solution_data = {
                    "id": s.get("id"),
                    "solution": s["solution"],
                    "created_at": s["created_at"].isoformat() if s.get("created_at") else None,
                    "created_by": s.get("created_by"),
                    "version": s.get("version"),
                    "confidence_score": float(s["confidence_score"]) if s.get("confidence_score") is not None else None,
                    "usage_count": s.get("usage_count"),
                }
        except Exception as e:
            print(f"[Breaks] solution query error: {e}")
            solution_error = f"Failed to load solution: {str(e)}"

        ai_recommendation = None
        try:
            ai_recommendation = get_ai_recommendations(error_hash, project_name)
        except Exception as e:
            print(f"[Breaks] ai recommendation error: {e}")

        result = {
            "project_name": first["project_name"],
            "file_name": file_name,
            "error_message": first["error_message"],
            "error_detail": first.get("error_detail"),
            "error_hash": error_hash,
            "occurrence_count": occurrence_count,
            "first_seen": first_seen,
            "status": status,
            "error_status": first.get("error_status"),
            "occurrences": serialize_rows(occurrences),
            "solution": solution_data,
            "solution_error": solution_error,
            "ai_recommendation": ai_recommendation,
        }
        return jsonify(serialize_row(result))
    except Exception as e:
        import traceback as _tb
        tb_str = _tb.format_exc()
        request_id = g.get("request_id", "unknown")
        print(f"[req:{request_id}] [Breaks:detail] ERROR: {type(e).__name__}: {e}")
        print(f"[req:{request_id}] [Breaks:detail] error_hash={error_hash} project_name={project_name}")
        print(f"[req:{request_id}] [Breaks:detail] Traceback:\n{tb_str}")
        return jsonify({
            "error": "Not Found",
            "message": "Error not found or failed to load.",
            "trace_id": request_id,
        }), 404


# ═══════════════════════════════════════════════════════════════════════════════
# LEGACY DASHBOARD (GET /api/dashboard — used by useDashboard.ts hook)
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/dashboard")
def dashboard_legacy():
    """
    GET /api/dashboard — returns aggregated break counts, trend, etc.
    """
    try:
        def safe_count(sql):
            try:
                r = query(sql)
                return int(r[0]["count"]) if r else 0
            except Exception:
                return 0

        last24h = safe_count(
            f"SELECT COUNT(*) AS count FROM {TABLE} "
            f"WHERE row_type = 'log' AND error IS NOT NULL AND error <> '' "
            f"AND timestamp >= NOW() - INTERVAL '24 hours'"
        )
        last7d = safe_count(
            f"SELECT COUNT(*) AS count FROM {TABLE} "
            f"WHERE row_type = 'log' AND error IS NOT NULL AND error <> '' "
            f"AND timestamp >= NOW() - INTERVAL '7 days'"
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
# ERROR SOLUTIONS / KNOWLEDGE BASE
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/knowledge_base/reopen", methods=["POST"])
def reopen_error_solution():
    body = request.get_json() or {}
    error_hash = body.get("error_hash")
    project_name = body.get("project_name")
    if not error_hash or not project_name:
        return jsonify({"error": "error_hash and project_name are required"}), 400
    try:
        count = execute(
            f"UPDATE {TABLE} SET error_status = 'reopened', reopened_at = NOW(), resolved_at = NULL "
            f"WHERE row_type = 'log' AND error_hash = %s AND LOWER(project_name) = LOWER(%s) "
            f"AND error_status IN ('resolved', 'reopened')",
            (error_hash, project_name),
        )
        return jsonify({"reopened": count, "project_name": project_name, "error_hash": error_hash})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/knowledge_base/resolve", methods=["POST"])
def resolve_error_solution():
    body = request.get_json() or {}
    error_hash = body.get("error_hash")
    project_name = body.get("project_name")
    if not error_hash or not project_name:
        return jsonify({"error": "error_hash and project_name are required"}), 400
    try:
        count = execute(
            f"UPDATE {TABLE} SET error_status = 'resolved', resolved_at = NOW() "
            f"WHERE row_type = 'log' AND error_hash = %s AND LOWER(project_name) = LOWER(%s) "
            f"AND error_status IN ('open', 'reopened')",
            (error_hash, project_name),
        )
        return jsonify({"resolved": count, "project_name": project_name, "error_hash": error_hash})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/knowledge_base/use", methods=["POST"])
def use_solution():
    body = request.get_json() or {}
    solution_id = body.get("solution_id")
    error_hash = body.get("error_hash")
    project_name = body.get("project_name")
    if not solution_id or not error_hash or not project_name:
        return jsonify({"error": "solution_id, error_hash and project_name are required"}), 400
    try:
        increment_usage(solution_id)
        execute(
            f"UPDATE {TABLE} SET error_status = 'resolved', resolved_at = NOW() "
            f"WHERE row_type = 'log' AND error_hash = %s AND LOWER(project_name) = LOWER(%s) "
            "AND error_status IN ('open', 'reopened')",
            (error_hash, project_name),
        )
        return jsonify({"used": True, "solution_id": solution_id})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e), "exception": type(e).__name__}), 500


@app.route("/api/knowledge_base/<solution_id>/versions", methods=["GET"])
def get_solution_versions_route(solution_id):
    try:
        versions = get_solution_versions(solution_id)
        return jsonify({"versions": versions})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e), "exception": type(e).__name__}), 500


@app.route("/api/knowledge_base/<solution_id>/versions/<version_id>", methods=["DELETE"])
def delete_solution_version_route(solution_id, version_id):
    try:
        count = delete_solution_version(version_id)
        return jsonify({"deleted": count > 0, "version_id": version_id})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e), "exception": type(e).__name__}), 500


@app.route("/api/knowledge_base/top", methods=["GET"])
def get_top_solutions_route():
    error_hash = request.args.get("error_hash")
    project_name = request.args.get("project_name")
    limit = int(request.args.get("limit", "5"))
    offset = int(request.args.get("offset", "0"))
    if not error_hash:
        return jsonify({"error": "error_hash is required"}), 400
    try:
        rows, total = get_top_solutions(error_hash, project_name, limit=limit, offset=offset)
        return jsonify({"solutions": rows, "total": total})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e), "exception": type(e).__name__}), 500


@app.route("/api/knowledge_base/<error_hash>", methods=["GET"])
def get_error_solution(error_hash):
    try:
        hash_candidates = build_error_hash_candidates(error_hash, None)
        params = list(hash_candidates) if hash_candidates else [error_hash]
        rows = query(
            f"SELECT solution, created_at "
            f"FROM {TABLE} WHERE row_type = 'solution' AND (" + " OR ".join(["error_hash = %s"] * len(params)) + ") "
            f"ORDER BY created_at DESC LIMIT 1",
            tuple(params),
        )
        if not rows:
            return jsonify({"solution": None})
        r = rows[0]
        return jsonify({
            "solution": r["solution"],
            "updated_at": r["created_at"].isoformat() if r.get("created_at") else None,
        })
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e), "exception": type(e).__name__}), 500


@app.route("/api/knowledge_base", methods=["POST"])
def upsert_error_solution():
    body = request.get_json() or {}
    error_hash = body.get("error_hash")
    solution = body.get("solution")
    created_by = body.get("created_by") or "developer"
    project_name = body.get("project_name")
    base_solution_id = body.get("base_solution_id")
    if not error_hash:
        return jsonify({"error": "error_hash is required"}), 400
    if not solution:
        return jsonify({"error": "solution is required"}), 400
    check_only = bool(body.get("check_only"))
    force_create = bool(body.get("create_anyway") or body.get("force_create"))
    try:
        row = insert_solution(
            error_hash,
            solution,
            created_by=created_by,
            project_name=project_name,
            base_solution_id=base_solution_id,
            force_create=force_create,
            check_only=check_only,
        )
        status_code = 200 if check_only else 201
        return jsonify(serialize_row(row)), status_code
    except Exception as e:
        import traceback as _tb2
        tb_str = _tb2.format_exc()
        print(f"[KnowledgeBase] Save Solution FAILED — {type(e).__name__}: {e}")
        print(tb_str)
        return jsonify({
            "error": str(e),
            "exception": type(e).__name__,
            "traceback": tb_str,
            "kb_available": KB_AVAILABLE,
            "kb_import_error": str(_kb_import_err) if _kb_import_err else None,
            "kb_import_traceback": _kb_import_tb if _kb_import_tb else None,
        }), 500


@app.route("/api/knowledge_base/<error_hash>", methods=["DELETE"])
def delete_error_solution(error_hash):
    project_name = request.args.get("project_name")
    try:
        if project_name:
            execute(
                f"DELETE FROM {TABLE} WHERE row_type = 'solution' AND error_hash = %s AND LOWER(project_name) = LOWER(%s)",
                (error_hash, project_name),
            )
        else:
            execute(
                f"DELETE FROM {TABLE} WHERE row_type = 'solution' AND error_hash = %s",
                (error_hash,),
            )
        return make_response("", 204)
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e), "exception": type(e).__name__}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN (users) — requires admin token
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/users", methods=["GET"])
def list_users():
    _, err = require_role("admin")
    if err:
        return err
    try:
        rows = query(
            f"SELECT * FROM {TABLE} WHERE row_type = 'user' ORDER BY created_at DESC"
        )
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
            f"INSERT INTO {TABLE} (id, row_type, email, role, oauth_provider, oauth_subject, created_at) "
            f"VALUES (%s,'user',%s,%s,%s,%s,NOW()) RETURNING *",
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
        count = execute(
            f"DELETE FROM {TABLE} WHERE row_type = 'user' AND id = %s",
            (user_id,),
        )
        if count == 0:
            return jsonify({"error": "User not found"}), 404
        return make_response("", 204)
    except Exception:
        return jsonify({"error": "Internal server error"}), 500

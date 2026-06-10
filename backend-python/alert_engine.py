"""
Alert engine — single-shot check safe to call from Lambda.
Wire an EventBridge scheduled rule (rate: 1 minute) to invoke
the alert_handler export in lambda_function.py.
"""

import uuid
from db import query, execute
from teams import send_teams_alert

SYSTEM_TABLES = {
    "alert_rules", "alert_history", "users", "projects",
    "saved_filters", "retention_policies", "parse_errors",
    "audit_log", "break_groups", "breaks", "error_solutions",
    "Image_Forensics",
}


def get_project_tables() -> list[str]:
    """Discover live project tables via information_schema."""
    # Check if projects.is_live column exists
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
            "AND REPLACE(c.table_name, '_', ' ') IN "
            "(SELECT name FROM projects WHERE is_live = true)"
        )
    else:
        live_filter = "AND c.table_name IN ('tand_f_rubriq_processing', 'language_quality_score')"

    rows = query(f"""
        SELECT DISTINCT c.table_name
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.column_name = 'project_name'
          AND c.table_name NOT IN (
              'alert_rules', 'alert_history', 'users', 'projects',
              'saved_filters', 'retention_policies', 'parse_errors',
              'audit_log', 'break_groups', 'breaks', 'error_solutions',
              'Image_Forensics'
          )
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
    """)
    return [r["table_name"] for r in rows]


def insert_history(rule_id: str, project_name: str, error: str, alert_type: str) -> bool:
    """Insert alert_history with DB-level 1-minute dedup. Returns True if inserted."""
    existing = query(
        """SELECT id FROM alert_history
           WHERE rule_id = %s AND project_name = %s AND error = %s
             AND triggered_at >= NOW() - INTERVAL '1 minute'
           LIMIT 1""",
        (rule_id, project_name, error),
    )
    if existing:
        return False
    execute(
        "INSERT INTO alert_history (id, rule_id, project_name, error, alert_type) "
        "VALUES (%s, %s, %s, %s, %s)",
        (str(uuid.uuid4()), rule_id, project_name, error, alert_type),
    )
    return True


def run_alert_check_once() -> None:
    """Run one pass of the alert engine. Call this from Lambda."""
    print("[AlertEngine] running check…")

    rules = query(
        "SELECT id, rule_name, project_name, alert_type, threshold, window_minutes "
        "FROM alert_rules WHERE is_active = true"
    )
    if not rules:
        print("[AlertEngine] no active rules")
        return

    tables = get_project_tables()
    if not tables:
        print("[AlertEngine] no project tables found")
        return

    for rule in rules:
        rule_id      = rule["id"]
        rule_name    = rule["rule_name"]
        alert_type   = rule["alert_type"]
        rule_project = rule["project_name"]

        # Filter tables to those matching the rule's project (if specified)
        if rule_project:
            target = [
                t for t in tables
                if t.lower() == rule_project.lower().replace(" ", "_")
                or t.lower().replace("_", " ") == rule_project.lower()
            ]
        else:
            target = tables

        if not target:
            print(f"[AlertEngine] no table for project='{rule_project}' — skipping")
            continue

        for table in target:
            try:
                if alert_type == "High Failure":
                    threshold = rule["threshold"] or 5
                    window    = rule["window_minutes"] or 5
                    rows = query(
                        f"""SELECT project_name, error, COUNT(*) AS cnt
                            FROM "{table}"
                            WHERE error IS NOT NULL AND error <> ''
                              AND error_status IN ('open', 'reopened')
                              AND timestamp >= NOW() - INTERVAL '{window} minutes'
                            GROUP BY project_name, error
                            HAVING COUNT(*) >= %s""",
                        (threshold,),
                    )
                    for r in rows:
                        inserted = insert_history(rule_id, r["project_name"], r["error"], alert_type)
                        if inserted:
                            print(f"[AlertEngine] 🔥 High Failure → {rule_name} | {r['project_name']} | count={r['cnt']}")
                            send_teams_alert(rule_name, alert_type, r["project_name"], r["error"], count=int(r["cnt"]))

                elif alert_type == "New Error":
                    rows = query(
                        f"""SELECT DISTINCT project_name, error
                            FROM "{table}"
                            WHERE error IS NOT NULL AND error <> ''
                              AND error_status = 'open'
                              AND timestamp >= NOW() - INTERVAL '30 seconds'"""
                    )
                    for r in rows:
                        inserted = insert_history(rule_id, r["project_name"], r["error"], alert_type)
                        if inserted:
                            print(f"[AlertEngine] 🆕 New Error → {rule_name} | {r['project_name']}")
                            send_teams_alert(rule_name, alert_type, r["project_name"], r["error"])

                elif alert_type == "Regression":
                    rows = query(
                        f"""SELECT DISTINCT project_name, error
                            FROM "{table}"
                            WHERE error IS NOT NULL AND error <> ''
                              AND error_status = 'reopened'
                              AND reopened_at >= NOW() - INTERVAL '30 seconds'"""
                    )
                    for r in rows:
                        inserted = insert_history(rule_id, r["project_name"], r["error"], alert_type)
                        if inserted:
                            print(f"[AlertEngine] 🔄 Regression → {rule_name} | {r['project_name']}")
                            send_teams_alert(rule_name, alert_type, r["project_name"], r["error"])

            except Exception as e:
                print(f"[AlertEngine] error processing table {table}: {e}")

    print("[AlertEngine] check complete")

"""
Run the single-table migration against Aurora DSQL.
Uses the existing db.py connection logic (IAM auth).
"""
from db import execute, query

print("[Migration] Starting single-table migration...")

# 1. Create project_results table
print("[Migration] Creating project_results table...")
execute("""
    CREATE TABLE IF NOT EXISTS project_results (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_name    TEXT NOT NULL,
        file_name       TEXT,
        timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        success_count   INTEGER NOT NULL DEFAULT 0,
        failure_count   INTEGER NOT NULL DEFAULT 0,
        error           TEXT,
        error_hash      TEXT,
        error_status    TEXT DEFAULT 'open',
        error_detail    TEXT,
        llm_usage       TEXT,
        input_tokens    INTEGER,
        output_tokens   INTEGER,
        calculated_cost NUMERIC(12, 6),
        word_count      INTEGER,
        file_type       TEXT,
        resolved_at     TIMESTAMPTZ,
        reopened_at     TIMESTAMPTZ,
        first_seen      TIMESTAMPTZ
    )
""")
print("[Migration] project_results table created.")

# 2. Create indexes
print("[Migration] Creating indexes...")
execute("""
    CREATE INDEX IF NOT EXISTS idx_pr_project_name
    ON project_results (LOWER(project_name))
""")
execute("""
    CREATE INDEX IF NOT EXISTS idx_pr_timestamp
    ON project_results (timestamp DESC)
""")
execute("""
    CREATE INDEX IF NOT EXISTS idx_pr_error_hash
    ON project_results (error_hash)
""")
execute("""
    CREATE INDEX IF NOT EXISTS idx_pr_error_status
    ON project_results (error_status)
""")

print("[Migration] Indexes created.")

# 3. Ensure projects table exists (it should already from earlier migrations)
execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name       TEXT NOT NULL UNIQUE,
        category   TEXT,
        is_live    BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
""")
print("[Migration] projects table verified.")

# 4. Check current state
projects = query("SELECT COUNT(*) AS cnt FROM projects")
print(f"[Migration] Projects in registry: {projects[0]['cnt']}")

results = query("SELECT COUNT(*) AS cnt FROM project_results")
print(f"[Migration] Rows in project_results: {results[0]['cnt']}")

print("\n[Migration] DONE! Migration complete.")
print("\nNOTE: If project_results is empty, you need to migrate data from")
print("the old per-project tables. Run the data migration next.")

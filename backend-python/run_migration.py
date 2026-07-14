"""
Run the single-table migration against Aurora DSQL.
Uses the existing db.py connection logic (IAM auth).
"""
from db import execute, query

print("[Migration] Starting single-table migration...")

# 1. Create projects_data table
print("[Migration] Creating projects_data table...")
execute("""
    CREATE TABLE IF NOT EXISTS projects_data (
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
print("[Migration] projects_data table created.")

# 2. Create indexes
print("[Migration] Creating indexes...")
execute("""
    CREATE INDEX IF NOT EXISTS idx_pr_project_name
    ON projects_data (LOWER(project_name))
""")
execute("""
    CREATE INDEX IF NOT EXISTS idx_pr_timestamp
    ON projects_data (timestamp DESC)
""")
execute("""
    CREATE INDEX IF NOT EXISTS idx_pr_error_hash
    ON projects_data (error_hash)
""")
execute("""
    CREATE INDEX IF NOT EXISTS idx_pr_error_status
    ON projects_data (error_status)
""")
execute("""
    CREATE TABLE IF NOT EXISTS knowledge_base (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_result_id UUID NOT NULL REFERENCES projects_data(id) ON DELETE CASCADE,
        solution TEXT NOT NULL,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        usage_count INTEGER NOT NULL DEFAULT 0,
        version INTEGER NOT NULL DEFAULT 1,
        confidence_score NUMERIC(5, 2) NOT NULL DEFAULT 50.0,
        embedding DOUBLE PRECISION[]
    )
""")
execute("""
    CREATE INDEX IF NOT EXISTS idx_kb_project_result_id
    ON knowledge_base (project_result_id)
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

results = query("SELECT COUNT(*) AS cnt FROM projects_data")
print(f"[Migration] Rows in projects_data: {results[0]['cnt']}")

print("\n[Migration] DONE! Migration complete.")
print("\nNOTE: If projects_data is empty, you need to migrate data from")
print("the old per-project tables. Run the data migration next.")

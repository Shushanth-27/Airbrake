-- Migration: Create single project_results table
-- This replaces all individual per-project tables with one unified table.

CREATE TABLE IF NOT EXISTS projects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  category   TEXT,
  is_live    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_pr_project_name
  ON project_results (LOWER(project_name));

CREATE INDEX IF NOT EXISTS idx_pr_timestamp
  ON project_results (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_pr_error_hash
  ON project_results (error_hash);

CREATE INDEX IF NOT EXISTS idx_pr_error_status
  ON project_results (error_status)
  WHERE error IS NOT NULL AND error <> '';

CREATE INDEX IF NOT EXISTS idx_pr_project_error_status
  ON project_results (LOWER(project_name), error_status)
  WHERE error IS NOT NULL AND error <> '';

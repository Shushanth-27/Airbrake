-- Migration: Create single projects_data table
-- This replaces all individual per-project tables with one unified table.

CREATE TABLE IF NOT EXISTS projects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  category   TEXT,
  is_live    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_pr_project_name
  ON projects_data (LOWER(project_name));

CREATE INDEX IF NOT EXISTS idx_pr_timestamp
  ON projects_data (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_pr_error_hash
  ON projects_data (error_hash);

CREATE INDEX IF NOT EXISTS idx_pr_error_status
  ON projects_data (error_status)
  WHERE error IS NOT NULL AND error <> '';

CREATE TABLE IF NOT EXISTS knowledge_base (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_result_id UUID NOT NULL REFERENCES projects_data(id) ON DELETE CASCADE,
  solution          TEXT NOT NULL,
  created_by        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usage_count       INTEGER NOT NULL DEFAULT 0,
  version           INTEGER NOT NULL DEFAULT 1,
  confidence_score  NUMERIC(5, 2) NOT NULL DEFAULT 50.0,
  embedding         DOUBLE PRECISION[]
);

CREATE INDEX IF NOT EXISTS idx_kb_project_result_id
  ON knowledge_base (project_result_id);

CREATE INDEX IF NOT EXISTS idx_pr_project_error_status
  ON projects_data (LOWER(project_name), error_status)
  WHERE error IS NOT NULL AND error <> '';

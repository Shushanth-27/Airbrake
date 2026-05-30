-- Migration 009: Create projects and project_usage_logs tables

CREATE TABLE IF NOT EXISTS projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Image_Forensics" (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name     TEXT NOT NULL REFERENCES projects (name) ON DELETE CASCADE,
  file_name        TEXT,
  llm_usage        TEXT,
  timestamp        TIMESTAMPTZ,
  input_tokens     INTEGER,
  output_tokens    INTEGER,
  calculated_cost  NUMERIC(12, 6),
  word_count       INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_image_forensics_project_name ON "Image_Forensics" (project_name);
CREATE INDEX IF NOT EXISTS idx_image_forensics_timestamp    ON "Image_Forensics" (timestamp DESC);

-- Migration 012: Create individual project tables

CREATE TABLE IF NOT EXISTS "DigiEdit_Language_(Books)" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name    TEXT NOT NULL DEFAULT 'DigiEdit Language (Books)',
  file_name       TEXT,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count   INTEGER NOT NULL DEFAULT 0,
  failure_count   INTEGER NOT NULL DEFAULT 0,
  error           TEXT
);

CREATE TABLE IF NOT EXISTS "DigiEdit_Language_(Journals)" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name    TEXT NOT NULL DEFAULT 'DigiEdit Language (Journals)',
  file_name       TEXT,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count   INTEGER NOT NULL DEFAULT 0,
  failure_count   INTEGER NOT NULL DEFAULT 0,
  error           TEXT
);

CREATE TABLE IF NOT EXISTS "Language_Editing" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name    TEXT NOT NULL DEFAULT 'Language Editing',
  file_name       TEXT,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count   INTEGER NOT NULL DEFAULT 0,
  failure_count   INTEGER NOT NULL DEFAULT 0,
  error           TEXT
);

CREATE TABLE IF NOT EXISTS "Language_Quality_Score" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name    TEXT NOT NULL DEFAULT 'Language Quality Score',
  file_name       TEXT,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count   INTEGER NOT NULL DEFAULT 0,
  failure_count   INTEGER NOT NULL DEFAULT 0,
  error           TEXT
);

CREATE TABLE IF NOT EXISTS "Language_Errors_Count" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name    TEXT NOT NULL DEFAULT 'Language Errors Count',
  file_name       TEXT,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count   INTEGER NOT NULL DEFAULT 0,
  failure_count   INTEGER NOT NULL DEFAULT 0,
  error           TEXT
);

CREATE TABLE IF NOT EXISTS "PPT_Generator" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name    TEXT NOT NULL DEFAULT 'PPT Generator',
  file_name       TEXT,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count   INTEGER NOT NULL DEFAULT 0,
  failure_count   INTEGER NOT NULL DEFAULT 0,
  error           TEXT
);

CREATE TABLE IF NOT EXISTS "Content_Creation" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name    TEXT NOT NULL DEFAULT 'Content Creation',
  file_name       TEXT,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count   INTEGER NOT NULL DEFAULT 0,
  failure_count   INTEGER NOT NULL DEFAULT 0,
  error           TEXT
);

CREATE TABLE IF NOT EXISTS "Image_Comparision_tool" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name    TEXT NOT NULL DEFAULT 'Image Comparision tool',
  file_name       TEXT,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count   INTEGER NOT NULL DEFAULT 0,
  failure_count   INTEGER NOT NULL DEFAULT 0,
  error           TEXT
);

CREATE TABLE IF NOT EXISTS "DEI" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name    TEXT NOT NULL DEFAULT 'DEI',
  file_name       TEXT,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count   INTEGER NOT NULL DEFAULT 0,
  failure_count   INTEGER NOT NULL DEFAULT 0,
  error           TEXT
);

-- Migration 013: Create individual project tables batch 2

CREATE TABLE IF NOT EXISTS "Meta_Data_Extraction" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'Meta Data Extraction',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "Synthetic_Data_Generation" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'Synthetic Data Generation',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "Alt_Text_(JSON_and_ZIP)" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'Alt Text (JSON and ZIP)',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "Alt_Text_(IDTF)" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'Alt Text (IDTF)',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "Alt_Text_(EPUB)" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'Alt Text (EPUB)',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "Sematic_Search_Bot" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'Sematic Search Bot',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "Alt_Text_(single_image)" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'Alt Text (single image)',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "Actual_Text" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'Actual Text',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "Story_Board_Assistance" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'Story Board Assistance',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "Proof_Reading" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'Proof Reading',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "Abstract_and_Keywords" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'Abstract and Keywords',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "Spell_Check" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'Spell Check',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "Speech_to_Text_Recognition" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'Speech to Text Recognition',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "AI_Assessment_Creation" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'AI Assessment Creation',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "PDF_chatbot" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'PDF chatbot',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "Image_relabelling" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'Image relabelling',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "Simple_Language_Summary" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'Simple Language Summary',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "Summary_generation" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'Summary generation',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "Highwire_Chatbot" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'Highwire Chatbot',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS "Image_Processing" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL DEFAULT 'Image Processing',
  file_name     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);

-- Migration 033: Add is_live flag to projects table
-- Only live projects appear in the dashboard and trigger Teams alerts.
-- Default false so existing projects are opt-in.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_live BOOLEAN NOT NULL DEFAULT false;

-- Mark a sensible set of production projects as live.
-- Adjust this list to match your actual live deployments.
UPDATE projects SET is_live = true WHERE name IN (
  'AI QC',
  'Language Editing',
  'DigiEdit Language (Books)',
  'DigiEdit Language (Journals)',
  'Alt Text (JSON and ZIP)',
  'Alt Text (IDTF)',
  'Alt Text (EPUB)',
  'Alt Text (single image)',
  'Actual Text',
  'XML Element Prediction',
  'Indexing',
  'Database Chat (Text2SQL)',
  'Language Translation',
  'Image Processing',
  'PDF chatbot'
);

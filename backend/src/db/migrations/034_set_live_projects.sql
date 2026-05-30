-- Migration 034: Set only the 2 integrated live projects as is_live = true
-- Covers both space and underscore variants of the table names.

UPDATE projects SET is_live = false;

UPDATE projects SET is_live = true WHERE name IN (
  'TandF Rubriq proessing',
  'TandF_Rubriq_proessing',
  'Language Quality Score',
  'Language_Quality_Score'
);

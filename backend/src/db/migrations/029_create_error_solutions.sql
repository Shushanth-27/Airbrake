-- Migration 029: Create error_solutions table
-- Stores solutions keyed by error_hash so the same error across all projects shares one solution.

CREATE TABLE IF NOT EXISTS error_solutions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_hash TEXT UNIQUE NOT NULL,
  solution   TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

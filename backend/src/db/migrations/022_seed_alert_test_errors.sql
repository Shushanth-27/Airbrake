-- Migration 022: Seed 6 error rows in AI_QC to trigger High Failure alert rule
-- resolved_at and reopened_at are left NULL intentionally.

INSERT INTO "AI_QC"
  (project_name, file_name, timestamp, success_count, failure_count, error,
   llm_usage, input_tokens, output_tokens, calculated_cost, word_count, file_type,
   error_hash, error_status, resolved_at, reopened_at)
VALUES
  ('AI QC', 'batch_001.pdf', NOW(), 0, 1, 'RuntimeError: Model inference failed — CUDA out of memory', NULL, NULL, NULL, NULL, NULL, NULL, md5('AI QC' || 'runtimeerror: model inference failed — cuda out of memory'), 'open', NULL, NULL),
  ('AI QC', 'batch_002.pdf', NOW(), 0, 1, 'RuntimeError: Model inference failed — CUDA out of memory', NULL, NULL, NULL, NULL, NULL, NULL, md5('AI QC' || 'runtimeerror: model inference failed — cuda out of memory'), 'open', NULL, NULL),
  ('AI QC', 'batch_003.pdf', NOW(), 0, 1, 'RuntimeError: Model inference failed — CUDA out of memory', NULL, NULL, NULL, NULL, NULL, NULL, md5('AI QC' || 'runtimeerror: model inference failed — cuda out of memory'), 'open', NULL, NULL),
  ('AI QC', 'batch_004.pdf', NOW(), 0, 1, 'RuntimeError: Model inference failed — CUDA out of memory', NULL, NULL, NULL, NULL, NULL, NULL, md5('AI QC' || 'runtimeerror: model inference failed — cuda out of memory'), 'open', NULL, NULL),
  ('AI QC', 'batch_005.pdf', NOW(), 0, 1, 'RuntimeError: Model inference failed — CUDA out of memory', NULL, NULL, NULL, NULL, NULL, NULL, md5('AI QC' || 'runtimeerror: model inference failed — cuda out of memory'), 'open', NULL, NULL),
  ('AI QC', 'batch_006.pdf', NOW(), 0, 1, 'RuntimeError: Model inference failed — CUDA out of memory', NULL, NULL, NULL, NULL, NULL, NULL, md5('AI QC' || 'runtimeerror: model inference failed — cuda out of memory'), 'open', NULL, NULL);

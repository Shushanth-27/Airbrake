/**
 * Ingest Router
 *
 * Two endpoints:
 *
 * ── POST /api/ingest/error ────────────────────────────────────────────────────
 * Insert a FAILURE row. Sends Teams alert.
 * Required: project_name, error
 *
 * ── POST /api/ingest/log ──────────────────────────────────────────────────────
 * Insert ANY row — success OR error. No Teams alert for pure success rows.
 * Required: project_name
 * If "error" is provided → stored as failure (error_status = 'open'), Teams alert sent
 * If no "error"          → stored as success (error_status = null, success_count = 1)
 *
 * Common optional fields (both endpoints):
 *   file_name, error_detail, success_count, failure_count,
 *   word_count, file_type, input_tokens, output_tokens,
 *   calculated_cost, llm_usage
 *
 * ── Examples ──────────────────────────────────────────────────────────────────
 *
 * Success log:
 *   POST /api/ingest/log
 *   { "project_name": "AI QC", "file_name": "DH.pdf", "success_count": 1 }
 *
 * Error log:
 *   POST /api/ingest/log
 *   { "project_name": "AI QC", "file_name": "DH.pdf",
 *     "error": "RuntimeError: CUDA out of memory",
 *     "error_detail": "Traceback..." }
 *
 * Error only (original endpoint — unchanged):
 *   POST /api/ingest/error
 *   { "project_name": "AI QC", "file_name": "DH.pdf",
 *     "error": "RuntimeError: CUDA out of memory" }
 */

import { Pool } from 'pg';
import * as crypto from 'crypto';
import { sendTeamsAlert } from '../alerts/teamsNotifier';

// ─── Shared insert helper ─────────────────────────────────────────────────────

async function insertRow(
  pool: Pool,
  params: {
    projectName:    string;
    tableName:      string;
    fileName:       string | null;
    error:          string | null;
    errorDetail:    string | null;
    errorHash:      string | null;
    errorStatus:    string | null;   // 'open' | null
    successCount:   number;
    failureCount:   number;
    wordCount:      number | null;
    fileType:       string | null;
    inputTokens:    number | null;
    outputTokens:   number | null;
    calculatedCost: number | null;
    llmUsage:       string | null;
  },
) {
  const { rows } = await pool.query(
    `INSERT INTO "${params.tableName}" (
       id, project_name, file_name, timestamp,
       success_count, failure_count,
       error, error_detail, error_hash, error_status,
       word_count, file_type,
       input_tokens, output_tokens, calculated_cost, llm_usage
     ) VALUES (
       gen_random_uuid(), $1, $2, NOW(),
       $3, $4,
       $5, $6, $7, $8,
       $9, $10,
       $11, $12, $13, $14
     )
     RETURNING id, project_name, file_name, error, error_detail,
               error_hash, error_status, success_count, failure_count, timestamp`,
    [
      params.projectName, params.fileName,
      params.successCount, params.failureCount,
      params.error, params.errorDetail, params.errorHash, params.errorStatus,
      params.wordCount, params.fileType,
      params.inputTokens, params.outputTokens, params.calculatedCost, params.llmUsage,
    ],
  );
  return rows[0];
}

function parseOptionalFields(body: Record<string, unknown>) {
  return {
    fileName:       typeof body.file_name        === 'string' ? body.file_name.trim() || null : null,
    errorDetail:    typeof body.error_detail      === 'string' ? body.error_detail.trim() || null : null,
    successCount:   typeof body.success_count     === 'number' ? body.success_count   : 0,
    failureCount:   typeof body.failure_count     === 'number' ? body.failure_count   : 1,
    wordCount:      typeof body.word_count        === 'number' ? body.word_count      : null,
    fileType:       typeof body.file_type         === 'string' ? body.file_type       : null,
    inputTokens:    typeof body.input_tokens      === 'number' ? body.input_tokens    : null,
    outputTokens:   typeof body.output_tokens     === 'number' ? body.output_tokens   : null,
    calculatedCost: typeof body.calculated_cost   === 'number' ? body.calculated_cost : null,
    llmUsage:       typeof body.llm_usage         === 'string' ? body.llm_usage       : null,
  };
}

async function verifyTable(pool: Pool, tableName: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName],
  );
  return rows.length > 0;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export function createErrorIngestRouter(pool: Pool) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const express = require('express');
  const router = express.Router();

  // ── POST /api/ingest/error — failure row only ─────────────────────────────

  router.post('/error', async (req: any, res: any) => {
    try {
      const body        = req.body as Record<string, unknown>;
      const projectName = typeof body.project_name === 'string' ? body.project_name.trim() : '';
      const error = typeof body.error === 'string' ? body.error.trim() : '';

      if (!projectName) {
        return res.status(400).json({ error: 'project_name is required' });
      }
      if (!error) {
        return res.status(400).json({ error: 'error is required' });
      }

      // ── Reject workflow/system JSON responses passed as errors ────────────
      // e.g. {"workflowId":"...","workflowStatus":"Queued"} is not a real error
      if (error.startsWith('{') && (error.includes('workflowId') || error.includes('workflowStatus'))) {
        console.warn(`[Ingest] ⚠️  Rejected non-error payload for "${projectName}": ${error.slice(0, 80)}`);
        return res.status(400).json({
          error: 'Invalid error value — received a workflow/system response object instead of an error message. ' +
                 'Pass the actual error string, not a JSON workflow response.',
          received: error.slice(0, 120),
        });
      }

      const tableName = projectName.replace(/ /g, '_');
      if (!(await verifyTable(pool, tableName))) {
        return res.status(404).json({
          error: `No table found for project "${projectName}". Check GET /api/projects for valid names.`,
        });
      }

      const opt = parseOptionalFields(body);
      // Override failure_count to 1 if not provided
      const failureCount = typeof body.failure_count === 'number' ? body.failure_count : 1;
      const successCount = typeof body.success_count === 'number' ? body.success_count : 0;

      const errorHash = crypto
        .createHash('md5')
        .update(`${error.toLowerCase().trim()}:${Date.now()}:${Math.random()}`)
        .digest('hex');

      const inserted = await insertRow(pool, {
        projectName, tableName,
        fileName:    opt.fileName,
        error,
        errorDetail: opt.errorDetail,
        errorHash,
        errorStatus: 'open',
        successCount,
        failureCount,
        wordCount:      opt.wordCount,
        fileType:       opt.fileType,
        inputTokens:    opt.inputTokens,
        outputTokens:   opt.outputTokens,
        calculatedCost: opt.calculatedCost,
        llmUsage:       opt.llmUsage,
      });

      console.log(`[Ingest] ❌ Error row → "${projectName}" | ${error} | id: ${inserted.id}`);

      // Teams alert for every error
      sendTeamsAlert({
        ruleName:    'Error Ingest',
        alertType:   'New Error',
        projectName,
        errorMsg:    error,
        errorDetail: opt.errorDetail ?? undefined,
      }).catch(() => {});

      return res.status(201).json({
        success:       true,
        type:          'error',
        id:            inserted.id,
        project_name:  inserted.project_name,
        file_name:     inserted.file_name,
        error:         inserted.error,
        error_detail:  inserted.error_detail,
        error_hash:    inserted.error_hash,
        error_status:  inserted.error_status,
        failure_count: inserted.failure_count,
        timestamp:     inserted.timestamp,
      });

    } catch (err: any) {
      console.error('[Ingest] error insert failed:', err);
      if (err.code === '42703') {
        return res.status(400).json({ error: `Column not found: ${err.message}` });
      }
      return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
  });

  // ── POST /api/ingest/log — success OR error row ───────────────────────────

  router.post('/log', async (req: any, res: any) => {
    try {
      const body        = req.body as Record<string, unknown>;
      const projectName = typeof body.project_name === 'string' ? body.project_name.trim() : '';

      if (!projectName) return res.status(400).json({ error: 'project_name is required' });

      const tableName = projectName.replace(/ /g, '_');
      if (!(await verifyTable(pool, tableName))) {
        return res.status(404).json({
          error: `No table found for project "${projectName}". Check GET /api/projects for valid names.`,
        });
      }

      const opt   = parseOptionalFields(body);
      const error = typeof body.error === 'string' ? body.error.trim() : '';

      // Ignore workflow/system JSON responses passed as errors
      const isWorkflowResponse = error.startsWith('{') &&
        (error.includes('workflowId') || error.includes('workflowStatus'));

      const isError = error.length > 0 && !isWorkflowResponse;

      if (isWorkflowResponse) {
        console.warn(`[Ingest] ⚠️  Ignoring workflow response as error for "${projectName}": ${error.slice(0, 80)}`);
      }

      // For success: success_count=1, failure_count=0, no error_status
      // For error:   success_count=0, failure_count=1, error_status='open'
      const successCount  = typeof body.success_count === 'number'
        ? body.success_count
        : isError ? 0 : 1;
      const failureCount  = typeof body.failure_count === 'number'
        ? body.failure_count
        : isError ? 1 : 0;

      const errorHash = isError
        ? crypto.createHash('md5').update(`${error.toLowerCase().trim()}:${Date.now()}:${Math.random()}`).digest('hex')
        : null;

      const inserted = await insertRow(pool, {
        projectName, tableName,
        fileName:    opt.fileName,
        error:       isError ? error : null,
        errorDetail: opt.errorDetail,
        errorHash,
        errorStatus: isError ? 'open' : null,
        successCount,
        failureCount,
        wordCount:      opt.wordCount,
        fileType:       opt.fileType,
        inputTokens:    opt.inputTokens,
        outputTokens:   opt.outputTokens,
        calculatedCost: opt.calculatedCost,
        llmUsage:       opt.llmUsage,
      });

      const type = isError ? 'error' : 'success';
      console.log(`[Ingest] ${isError ? '❌' : '✅'} ${type} row → "${projectName}" | file: ${opt.fileName ?? '-'} | id: ${inserted.id}`);

      // Teams alert only for errors
      if (isError) {
        sendTeamsAlert({
          ruleName:    'Log Ingest',
          alertType:   'New Error',
          projectName,
          errorMsg:    error,
          errorDetail: opt.errorDetail ?? undefined,
        }).catch(() => {});
      }

      return res.status(201).json({
        success:       true,
        type,
        id:            inserted.id,
        project_name:  inserted.project_name,
        file_name:     inserted.file_name,
        error:         inserted.error,
        error_status:  inserted.error_status,
        success_count: inserted.success_count,
        failure_count: inserted.failure_count,
        timestamp:     inserted.timestamp,
      });

    } catch (err: any) {
      console.error('[Ingest] log insert failed:', err);
      if (err.code === '42703') {
        return res.status(400).json({ error: `Column not found: ${err.message}` });
      }
      return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
  });

  // ── POST /api/ingest/success — success row only ──────────────────────────
  //
  // Stores a successful file processing record in the project table.
  // No Teams alert — success rows are informational only.
  //
  // Required: project_name
  // Optional: file_name, success_count, word_count, file_type,
  //           input_tokens, output_tokens, calculated_cost, llm_usage
  //
  // curl example:
  //   curl -X POST http://localhost:3001/api/ingest/success \
  //     -H "Content-Type: application/json" \
  //     -d '{"project_name":"AI QC","file_name":"DH.pdf","success_count":1}'

  router.post('/success', async (req: any, res: any) => {
    try {
      const body        = req.body as Record<string, unknown>;
      const projectName = typeof body.project_name === 'string' ? body.project_name.trim() : '';

      if (!projectName) {
        return res.status(400).json({ error: 'project_name is required' });
      }

      const tableName = projectName.replace(/ /g, '_');
      if (!(await verifyTable(pool, tableName))) {
        return res.status(404).json({
          error: `No table found for project "${projectName}". Check GET /api/projects for valid names.`,
        });
      }

      const opt          = parseOptionalFields(body);
      const successCount = typeof body.success_count === 'number' ? body.success_count : 1;

      const inserted = await insertRow(pool, {
        projectName, tableName,
        fileName:       opt.fileName,
        error:          null,
        errorDetail:    null,
        errorHash:      null,
        errorStatus:    null,
        successCount,
        failureCount:   0,
        wordCount:      opt.wordCount,
        fileType:       opt.fileType,
        inputTokens:    opt.inputTokens,
        outputTokens:   opt.outputTokens,
        calculatedCost: opt.calculatedCost,
        llmUsage:       opt.llmUsage,
      });

      console.log(`[Ingest] ✅ Success row → "${projectName}" | file: ${opt.fileName ?? '-'} | id: ${inserted.id}`);

      return res.status(201).json({
        success:       true,
        type:          'success',
        id:            inserted.id,
        project_name:  inserted.project_name,
        file_name:     inserted.file_name,
        error:         null,
        error_status:  null,
        success_count: inserted.success_count,
        failure_count: inserted.failure_count,
        timestamp:     inserted.timestamp,
      });

    } catch (err: any) {
      console.error('[Ingest] success insert failed:', err);
      if (err.code === '42703') {
        return res.status(400).json({ error: `Column not found: ${err.message}` });
      }
      return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
  });

  return router;
}

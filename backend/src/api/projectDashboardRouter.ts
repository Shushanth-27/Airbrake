/**
 * Project Dashboard Router
 * Serves the 4 endpoints the frontend Dashboard.tsx calls:
 *   GET /api/dashboard/top-projects       — top 10 by total row count
 *   GET /api/dashboard/top-error-projects — top 10 by error row count
 *   GET /api/dashboard/today-errors       — all errors with a timestamp of today (UTC)
 *   GET /api/dashboard/errors             — errors filtered by optional ?from=&to= ISO params
 *
 * No auth required — these are internal monitoring endpoints.
 * Data is spread across 85 individual project tables; we discover them
 * dynamically via information_schema so no hardcoded table list is needed.
 */

import { Pool } from 'pg';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns all project table names from information_schema.
 * Only includes tables that have both `project_name` AND `error_status` columns,
 * ensuring the error-tracking queries don't fail on older tables.
 */
async function getProjectTables(pool: Pool): Promise<string[]> {
  const { rows } = await pool.query<{ table_name: string }>(`
    SELECT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name = 'project_name'
      AND c.table_name != 'Image_Forensics'
      AND c.table_name IN (
        SELECT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = 'error_status'
      )
    ORDER BY c.table_name
  `);
  return rows.map((r) => r.table_name);
}

/**
 * Builds a UNION ALL query across all project tables selecting
 * project_name, file_name, error, timestamp — only active (non-resolved) errors.
 */
function buildErrorUnion(tables: string[], extraWhere = ''): string {
  const parts = tables.map(
    (t) => `SELECT project_name, file_name, error, error_detail, timestamp, reopened_at FROM "${t}" WHERE error IS NOT NULL AND error <> '' AND error_status IN ('open', 'reopened')${extraWhere}`,
  );
  return parts.join('\n UNION ALL\n');
}

/**
 * Builds a UNION ALL query across all project tables selecting
 * project_name and COUNT(*) — for total usage (all rows).
 */
function buildTotalUnion(tables: string[]): string {
  const parts = tables.map(
    (t) => `SELECT project_name, COUNT(*) AS cnt FROM "${t}" GROUP BY project_name`,
  );
  return parts.join('\n UNION ALL\n');
}

// ─── Router factory ───────────────────────────────────────────────────────────

export function createProjectDashboardRouter(pool: Pool) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const express = require('express');
  const router = express.Router();

  // GET /top-projects — top 10 projects by total row count
  router.get('/top-projects', async (_req: any, res: any) => {
    try {
      const tables = await getProjectTables(pool);
      if (tables.length === 0) return res.json({ projects: [] });

      const union = buildTotalUnion(tables);
      const { rows } = await pool.query(`
        SELECT project_name, SUM(cnt)::int AS total
        FROM (${union}) AS combined
        GROUP BY project_name
        ORDER BY total DESC
        LIMIT 10
      `);
      res.json({ projects: rows });
    } catch (err) {
      console.error('[Dashboard] top-projects error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /top-error-projects — top 10 projects by error count
  router.get('/top-error-projects', async (_req: any, res: any) => {
    try {
      const tables = await getProjectTables(pool);
      if (tables.length === 0) return res.json({ projects: [] });

      const parts = tables.map(
        (t) => `SELECT project_name, COUNT(*) AS cnt FROM "${t}" WHERE error IS NOT NULL AND error <> '' AND error_status IN ('open', 'reopened') GROUP BY project_name`,
      );
      const union = parts.join('\n UNION ALL\n');

      const { rows } = await pool.query(`
        SELECT project_name, SUM(cnt)::int AS total
        FROM (${union}) AS combined
        GROUP BY project_name
        HAVING SUM(cnt) > 0
        ORDER BY total DESC
        LIMIT 10
      `);
      res.json({ projects: rows });
    } catch (err) {
      console.error('[Dashboard] top-error-projects error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /today-errors — all errors where timestamp is today (UTC)
  router.get('/today-errors', async (_req: any, res: any) => {
    try {
      const tables = await getProjectTables(pool);
      if (tables.length === 0) return res.json({ date: new Date().toISOString().slice(0, 10), errors: [] });

      const todayWhere = ` AND (
        (timestamp AT TIME ZONE 'UTC' >= CURRENT_DATE AND timestamp AT TIME ZONE 'UTC' < CURRENT_DATE + INTERVAL '1 day')
        OR
        (reopened_at IS NOT NULL AND reopened_at AT TIME ZONE 'UTC' >= CURRENT_DATE AND reopened_at AT TIME ZONE 'UTC' < CURRENT_DATE + INTERVAL '1 day')
      )`;
      const union = buildErrorUnion(tables, todayWhere);

      const { rows } = await pool.query(`
        SELECT project_name AS project, file_name, error, error_detail, COALESCE(reopened_at, timestamp) AS timestamp
        FROM (${union}) AS combined
        ORDER BY timestamp DESC
      `);

      const date = new Date().toISOString().slice(0, 10);
      res.json({ date, errors: rows });
    } catch (err) {
      console.error('[Dashboard] today-errors error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /errors?from=ISO&to=ISO — errors in date range (or all if no params)
  router.get('/errors', async (req: any, res: any) => {

    try {
      const tables = await getProjectTables(pool);
      if (tables.length === 0) return res.json({ errors: [] });

      const { from, to } = req.query as Record<string, string | undefined>;

      let extraWhere = '';
      const values: string[] = [];

      if (from) {
        values.push(from);
        extraWhere += ` AND timestamp >= '${from.replace(/'/g, "''")}'`;
      }
      if (to) {
        extraWhere += ` AND timestamp <= '${to.replace(/'/g, "''")}'`;
      }

      const union = buildErrorUnion(tables, extraWhere);

      const { rows } = await pool.query(`
        SELECT project_name AS project, file_name, error, error_detail, timestamp
        FROM (${union}) AS combined
        ORDER BY timestamp DESC
        LIMIT 2000
      `);

      res.json({ errors: rows });
    } catch (err) {
      console.error('[Dashboard] errors error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /grouped?page=1&limit=20&status=&from=ISO&to=ISO
  // Groups errors by (project_name, error_hash) across all project tables.
  // Supports optional date range and status filter (new / existing / regression).
  router.get('/grouped', async (req: any, res: any) => {
    try {
      const tables = await getProjectTables(pool);
      if (tables.length === 0) return res.json({ data: [], total: 0, page: 1, limit: 20 });

      const page  = Math.max(1, parseInt(req.query.page  ?? '1',  10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '20', 10) || 20));
      const statusFilter: string = req.query.status ?? '';
      const from: string = req.query.from ?? '';
      const to:   string = req.query.to   ?? '';

      // Build date-range clause (safe — values are ISO strings, not user SQL)
      let dateWhere = '';
      if (from) dateWhere += ` AND timestamp >= '${from.replace(/'/g, "''")}'`;
      if (to)   dateWhere += ` AND timestamp <= '${to.replace(/'/g, "''")}'`;

      // UNION ALL across all tables — only active (non-resolved) errors
      const unionParts = tables.map(
        (t) => `SELECT project_name, error, error_detail, error_hash, timestamp, error_status, reopened_at FROM "${t}" WHERE error IS NOT NULL AND error <> '' AND error_status IN ('open', 'reopened')${dateWhere}`,
      );
      const union = unionParts.join('\nUNION ALL\n');

      // Group by project + error_hash, compute occurrence counts and first/last seen
      const grouped = `
        SELECT
          project_name,
          error                                        AS error_message,
          COALESCE(error_hash, MD5(LOWER(TRIM(error)))) AS error_hash,
          COUNT(*)::int                                AS occurrence_count,
          MIN(timestamp)                               AS first_seen,
          COALESCE(MAX(reopened_at), MAX(timestamp))   AS last_seen,
          CASE
            WHEN BOOL_OR(error_status = 'reopened') THEN 'regression'
            WHEN COUNT(*) = 1 THEN 'new'
            ELSE 'existing'
          END AS status
        FROM (${union}) AS all_errors
        GROUP BY project_name, error, COALESCE(error_hash, MD5(LOWER(TRIM(error))))
      `;

      // Apply optional status filter
      const statusWhere = statusFilter ? `WHERE status = '${statusFilter.replace(/'/g, "''")}'` : '';

      const countRes = await pool.query(`SELECT COUNT(*) FROM (${grouped}) AS g ${statusWhere}`);
      const total = parseInt(countRes.rows[0].count, 10);

      const offset = (page - 1) * limit;
      const dataRes = await pool.query(`
        SELECT * FROM (${grouped}) AS g
        ${statusWhere}
        ORDER BY last_seen DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `);

      res.json({ data: dataRes.rows, total, page, limit });
    } catch (err) {
      console.error('[Breaks] grouped error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}


/**
 * Upsert logic for per-project error tracking.
 *
 * POST /api/projects/:name/errors
 * Body: { file_name, error, error_hash?, ...other columns }
 *
 * Rules:
 *  - No existing row with this error_hash → INSERT with failure_count=1, error_status='open'
 *  - Existing row with error_status='resolved' → UPDATE to 'reopened', increment failure_count, set reopened_at=NOW(), clear resolved_at
 *  - Existing row with error_status='open' or 'reopened' → do NOT increment failure_count, just update timestamp
 */
export function createProjectErrorUpsertRouter(pool: Pool) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const express = require('express');
  const router = express.Router();

  router.post('/:name/errors', async (req: any, res: any) => {
    try {
      const projectName: string = decodeURIComponent(req.params.name);
      const tableName = projectName.replace(/ /g, '_');

      // Verify table exists
      const { rows: tableCheck } = await pool.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [tableName],
      );
      if (tableCheck.length === 0) {
        return res.status(404).json({ error: `No table found for project: ${projectName}` });
      }

      const body = req.body as Record<string, unknown>;
      const fileName: string = String(body.file_name ?? '');
      const errorMsg: string = String(body.error ?? '');

      if (!errorMsg) {
        return res.status(400).json({ error: 'error field is required' });
      }

      // Derive short error from error_detail (last line before first colon), fallback to errorMsg
      const errorDetail: string | undefined = (body.error_detail as string | undefined)?.trim() || undefined;
      let shortError = errorMsg;
      if (errorDetail) {
        const lines = errorDetail.split('\n').map((l: string) => l.trim()).filter(Boolean);
        const lastLine = lines[lines.length - 1] ?? errorMsg;
        shortError = lastLine.split(':')[0].trim() || errorMsg;
      }

      // Compute error_hash from error (short form) always — for consistent grouping/regression
      const hashSource = shortError.toLowerCase().trim();
      const errorHash: string = typeof body.error_hash === 'string' && body.error_hash
        ? body.error_hash
        : require('crypto').createHash('md5').update(hashSource).digest('hex');

      // Check for existing row with this error_hash
      const { rows: existing } = await pool.query(
        `SELECT id, error_status, failure_count FROM "${tableName}" WHERE error_hash = $1 LIMIT 1`,
        [errorHash],
      );

      if (existing.length === 0) {
        // ── New error: INSERT ──
        await pool.query(
          `INSERT INTO "${tableName}" (project_name, file_name, error, error_hash, failure_count, success_count, error_status, timestamp)
           VALUES ($1, $2, $3, $4, 1, 0, 'open', NOW())`,
          [projectName, fileName, errorMsg, errorHash],
        );
        return res.json({ action: 'inserted', error_status: 'open', failure_count: 1 });
      }

      const row = existing[0];

      if (row.error_status === 'resolved') {
        // ── Regression: reopen ──
        await pool.query(
          `UPDATE "${tableName}"
           SET error_status = 'reopened',
               failure_count = failure_count + 1,
               reopened_at = NOW(),
               resolved_at = NULL,
               timestamp = NOW(),
               file_name = $2
           WHERE error_hash = $1`,
          [errorHash, fileName],
        );
        return res.json({ action: 'reopened', error_status: 'reopened', failure_count: row.failure_count + 1 });
      }

      // ── Already open/reopened: just update timestamp, no count change ──
      await pool.query(
        `UPDATE "${tableName}" SET timestamp = NOW(), file_name = $2 WHERE error_hash = $1`,
        [errorHash, fileName],
      );
      return res.json({ action: 'unchanged', error_status: row.error_status, failure_count: row.failure_count });

    } catch (err) {
      console.error('[Projects] error upsert failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /api/projects/:name/errors/:hash/resolve — manually resolve an error
  router.patch('/:name/errors/:hash/resolve', async (req: any, res: any) => {
    try {
      const projectName: string = decodeURIComponent(req.params.name);
      const tableName = projectName.replace(/ /g, '_');
      const errorHash: string = req.params.hash;

      await pool.query(
        `UPDATE "${tableName}" SET error_status = 'resolved', resolved_at = NOW(), reopened_at = NULL WHERE error_hash = $1`,
        [errorHash],
      );
      res.json({ action: 'resolved' });
    } catch (err) {
      console.error('[Projects] resolve error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

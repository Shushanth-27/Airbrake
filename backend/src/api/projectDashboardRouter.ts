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
 * We exclude the meta-tables (projects, users, alert_rules, etc.) by
 * checking that the table has a `project_name` column.
 */
async function getProjectTables(pool: Pool): Promise<string[]> {
  const { rows } = await pool.query<{ table_name: string }>(`
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name = 'project_name'
      AND c.table_name != 'Image_Forensics'
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
    (t) => `SELECT project_name, file_name, error, timestamp FROM "${t}" WHERE error IS NOT NULL AND error <> '' AND error_status IN ('open', 'reopened')${extraWhere}`,
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

      const todayWhere = ` AND timestamp AT TIME ZONE 'UTC' >= CURRENT_DATE AND timestamp AT TIME ZONE 'UTC' < CURRENT_DATE + INTERVAL '1 day'`;
      const union = buildErrorUnion(tables, todayWhere);

      const { rows } = await pool.query(`
        SELECT project_name AS project, file_name, error, timestamp
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
        SELECT project_name AS project, file_name, error, timestamp
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
        (t) => `SELECT project_name, error, error_hash, timestamp FROM "${t}" WHERE error IS NOT NULL AND error <> '' AND error_status IN ('open', 'reopened')${dateWhere}`,
      );
      const union = unionParts.join('\nUNION ALL\n');

      // Group by project + error_hash, compute occurrence counts and first/last seen
      const grouped = `
        SELECT
          project_name,
          error                                        AS error_message,
          COALESCE(error_hash, MD5(project_name || LOWER(TRIM(error)))) AS error_hash,
          COUNT(*)::int                                AS occurrence_count,
          MIN(timestamp)                               AS first_seen,
          MAX(timestamp)                               AS last_seen,
          CASE
            WHEN COUNT(*) = 1 THEN 'new'
            WHEN COUNT(*) > 1 THEN 'existing'
            ELSE 'new'
          END AS status
        FROM (${union}) AS all_errors
        GROUP BY project_name, error, COALESCE(error_hash, MD5(project_name || LOWER(TRIM(error))))
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

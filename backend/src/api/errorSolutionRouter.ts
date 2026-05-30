/**
 * Error Solutions Router
 * GET  /api/error-solution/:error_hash  — fetch solution for an error
 * POST /api/error-solution              — save/update solution
 * DELETE /api/error-solution/:error_hash — delete solution
 *
 * Only touches error_solutions table. Does NOT modify project tables,
 * alert_rules, or alert_history.
 */

import { Pool } from 'pg';

export function createErrorSolutionRouter(pool: Pool) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const express = require('express');
  const router = express.Router();

  // POST /api/error-solution/resolve — must be before /:error_hash to avoid route conflict
  router.post('/resolve', async (req: any, res: any) => {
    try {
      const { error_hash, project_name } = req.body;
      if (!error_hash || !project_name) {
        return res.status(400).json({ error: 'error_hash and project_name are required' });
      }

      // Derive table name from project_name (spaces → underscores)
      const tableName = project_name.replace(/ /g, '_');

      // Verify table exists
      const { rows: tableCheck } = await pool.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1`,
        [tableName],
      );
      if (tableCheck.length === 0) {
        return res.status(404).json({ error: `No table found for project: ${project_name}` });
      }

      const { rowCount } = await pool.query(
        `UPDATE "${tableName}"
         SET error_status = 'resolved', resolved_at = NOW()
         WHERE error_hash = $1 AND error_status IN ('open', 'reopened')`,
        [error_hash],
      );

      console.log(`[ErrorResolve] resolved ${rowCount} rows for error_hash=${error_hash} in ${tableName}`);
      res.json({ resolved: rowCount ?? 0, project_name, error_hash });
    } catch (err) {
      console.error('[ErrorResolve] POST error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/error-solution/:error_hash
  router.get('/:error_hash', async (req: any, res: any) => {
    try {
      const { error_hash } = req.params;
      const { rows } = await pool.query(
        'SELECT solution, updated_at FROM error_solutions WHERE error_hash = $1',
        [error_hash],
      );
      if (rows.length === 0) return res.json({ solution: null });
      res.json({ solution: rows[0].solution, updated_at: rows[0].updated_at });
    } catch (err) {
      console.error('[ErrorSolution] GET error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/error-solution — upsert solution
  router.post('/', async (req: any, res: any) => {
    try {
      const { error_hash, solution } = req.body;
      if (!error_hash) return res.status(400).json({ error: 'error_hash is required' });

      const { rows } = await pool.query(
        `INSERT INTO error_solutions (error_hash, solution)
         VALUES ($1, $2)
         ON CONFLICT (error_hash)
         DO UPDATE SET solution = EXCLUDED.solution, updated_at = NOW()
         RETURNING *`,
        [error_hash, solution],
      );
      res.json(rows[0]);
    } catch (err) {
      console.error('[ErrorSolution] POST error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /api/error-solution/:error_hash
  router.delete('/:error_hash', async (req: any, res: any) => {
    try {
      const { error_hash } = req.params;
      await pool.query('DELETE FROM error_solutions WHERE error_hash = $1', [error_hash]);
      res.status(204).send();
    } catch (err) {
      console.error('[ErrorSolution] DELETE error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

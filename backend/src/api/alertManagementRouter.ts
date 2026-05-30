/**
 * Alert Management Router
 * Serves the alert_rules and alert_history tables directly.
 *
 * GET    /api/alert-rules              — list all rules
 * POST   /api/alert-rules              — create a rule (stored in DB)
 * PUT    /api/alert-rules/:id          — update a rule
 * DELETE /api/alert-rules/:id          — delete a rule
 * PATCH  /api/alert-rules/:id/toggle   — toggle is_active
 *
 * GET    /api/alert-history            — triggered alerts (?project=&alert_type=&from=&to=)
 */

import { Pool } from 'pg';

export function createAlertManagementRouter(pool: Pool) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const express = require('express');
  const router = express.Router();

  // ── Alert Rules ────────────────────────────────────────────────────────────

  // GET /api/alert-rules
  router.get('/alert-rules', async (_req: any, res: any) => {
    try {
      const { rows } = await pool.query(
        'SELECT id, rule_name, project_name, alert_type, threshold, window_minutes, is_active, created_at ' +
        'FROM alert_rules ORDER BY created_at DESC',
      );
      res.json(rows);
    } catch (err) {
      console.error('[AlertRules] GET error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/alert-rules — insert new rule into DB
  router.post('/alert-rules', async (req: any, res: any) => {
    try {
      const { rule_name, project_name, alert_type, threshold, window_minutes, is_active } = req.body;
      const { rows } = await pool.query(
        'INSERT INTO alert_rules (rule_name, project_name, alert_type, threshold, window_minutes, is_active) ' +
        'VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [rule_name, project_name, alert_type, threshold ?? null, window_minutes ?? null, is_active ?? true],
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('[AlertRules] POST error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /api/alert-rules/:id — update existing rule
  router.put('/alert-rules/:id', async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { rule_name, project_name, alert_type, threshold, window_minutes, is_active } = req.body;
      const { rows } = await pool.query(
        'UPDATE alert_rules ' +
        'SET rule_name = $1, project_name = $2, alert_type = $3, ' +
        '    threshold = $4, window_minutes = $5, is_active = $6 ' +
        'WHERE id = $7 RETURNING *',
        [rule_name, project_name, alert_type, threshold ?? null, window_minutes ?? null, is_active, id],
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
      res.json(rows[0]);
    } catch (err) {
      console.error('[AlertRules] PUT error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /api/alert-rules/:id/toggle — flip is_active
  router.patch('/alert-rules/:id/toggle', async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query(
        'UPDATE alert_rules SET is_active = NOT is_active WHERE id = $1 RETURNING *',
        [id],
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
      res.json(rows[0]);
    } catch (err) {
      console.error('[AlertRules] PATCH toggle error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /api/alert-rules/:id
  router.delete('/alert-rules/:id', async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { rowCount } = await pool.query('DELETE FROM alert_rules WHERE id = $1', [id]);
      if ((rowCount ?? 0) === 0) return res.status(404).json({ error: 'Rule not found' });
      res.status(204).send();
    } catch (err) {
      console.error('[AlertRules] DELETE error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ── Alert History ──────────────────────────────────────────────────────────

  // GET /api/alert-history?project=&alert_type=&from=&to=
  router.get('/alert-history', async (req: any, res: any) => {
    try {
      const conditions: string[] = [];
      const values: unknown[] = [];

      if (req.query.project) {
        values.push(req.query.project);
        conditions.push('h.project_name = $' + values.length);
      }
      if (req.query.alert_type) {
        values.push(req.query.alert_type);
        conditions.push('h.alert_type = $' + values.length);
      }
      if (req.query.from) {
        values.push(req.query.from);
        conditions.push('h.triggered_at >= $' + values.length);
      }
      if (req.query.to) {
        values.push(req.query.to);
        conditions.push('h.triggered_at <= $' + values.length);
      }

      const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

      const { rows } = await pool.query(
        'SELECT h.id, h.rule_id, r.rule_name, h.project_name, h.error, h.alert_type, h.triggered_at ' +
        'FROM alert_history h ' +
        'LEFT JOIN alert_rules r ON r.id = h.rule_id ' +
        where + ' ' +
        'ORDER BY h.triggered_at DESC',
        values,
      );
      res.json(rows);
    } catch (err) {
      console.error('[AlertHistory] GET error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

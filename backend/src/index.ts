/**
 * Backend entry point — wires all services together with Express REST API.
 */

import 'dotenv/config';
import WS from 'ws';
import { AirbrakeClient } from './airbrake/airbrakeClient';
import { AlertEngine } from './alerts/alertEngine';
import { createLogPipeline } from './pipeline/logPipeline';
import { PurgeJob } from './retention/purgeJob';
import { WebSocketServer } from './websocket/wsServer';
import { pool } from './db/client';

// ─── Stub adapters ────────────────────────────────────────────────────────────

const redisPublisher = {
  publish: async (channel: string, message: string) => {
    console.log(`[Redis] publish ${channel}: ${message.slice(0, 80)}…`);
  },
};

const redisPubSub = {
  subscribe: (channel: string, _handler: (msg: string) => void) => {
    console.log(`[Redis] subscribed to ${channel}`);
  },
  unsubscribe: (channel: string) => {
    console.log(`[Redis] unsubscribed from ${channel}`);
  },
};

const replayStore = {
  store: async (_channel: string, _message: string, _ts: Date) => {},
  getRecent: async (_channel: string, _since: Date): Promise<string[]> => [],
};

const logRecordRepository = {
  save: async (record: unknown) => {
    console.log('[PG] save log record', (record as { id: string }).id);
  },
};

const logSearchIndexer = {
  indexLogRecord: async (record: unknown) => {
    console.log('[ES] index log record', (record as { id: string }).id);
  },
};

const parseErrorRepository = {
  save: async (_rawPayload: unknown, errorMessage: string) => {
    console.error('[PG] parse error:', errorMessage);
  },
  write: async (_rawPayload: unknown, errorMessage: string) => {
    console.error('[PG] parse error:', errorMessage);
  },
};

const breakCountRepository = {
  countBreaksInWindow: async (_windowSeconds: number): Promise<number> => 0,
};

const notificationDispatcher = {
  send: async (channel: unknown, event: unknown) => {
    console.log('[Alert] dispatch', channel, event);
  },
};

const alertNotificationRepository = {
  markFailed: async (ruleId: string, event: unknown) => {
    console.error('[Alert] notification failed for rule', ruleId, event);
  },
};

const purgeRepository = {
  deleteLogsBefore: async (_cutoff: Date): Promise<number> => 0,
  deleteBreaksBefore: async (_cutoff: Date): Promise<number> => 0,
};

const retentionPolicyReader = {
  findAll: async () => [],
};

const httpClient = {
  get: async (_url: string, _headers: Record<string, string>): Promise<unknown> => ({ groups: [] }),
};

// ─── Service instantiation ────────────────────────────────────────────────────

const logPipeline = createLogPipeline(
  logRecordRepository,
  logSearchIndexer,
  redisPublisher,
  parseErrorRepository,
);

const airbrakeClient = new AirbrakeClient(
  {
    apiKey: process.env.AIRBRAKE_API_KEY ?? 'placeholder',
    projectId: process.env.AIRBRAKE_PROJECT_ID ?? 'placeholder',
    pollIntervalMs: parseInt(process.env.AIRBRAKE_POLL_INTERVAL ?? '30000', 10),
  },
  httpClient,
  redisPublisher,
);

const alertEngine = new AlertEngine(
  breakCountRepository,
  notificationDispatcher,
  alertNotificationRepository,
);

const purgeJob = new PurgeJob(purgeRepository, retentionPolicyReader);
const wsServer = new WebSocketServer(redisPubSub, replayStore);

// ─── Express app ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');
const app = express();
app.use(express.json());

app.use((_req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
  (res as any).setHeader('Access-Control-Allow-Origin', '*');
  (res as any).setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// ─── Swagger UI ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-var-requires
const swaggerUi = require('swagger-ui-express');
import { swaggerSpec } from './api/swagger';

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Airbrake Portal API Docs',
}));
app.get('/api/docs.json', (_req: unknown, res: any) => res.json(swaggerSpec));
app.get('/api/health', (_req: unknown, res: any) => res.json({ status: 'ok' }));

// ─── DB-backed repositories ───────────────────────────────────────────────────

import { createIngestRouter } from './api/ingestRouter';
import { createProjectDashboardRouter, createProjectErrorUpsertRouter } from './api/projectDashboardRouter';
import { createLogsRouterSync } from './api/logsRouter';
import { createBreaksRouterSync } from './api/breaksRouter';
import { createDashboardRouterSync } from './api/dashboardRouter';
import { createAlertsRouterSync } from './api/alertsRouter';
import { createFiltersRouterSync } from './api/filtersRouter';
import { createAdminRouterSync } from './api/adminRouter';
import { createRbacMiddleware } from './auth/rbac';
import { DefaultErrorAggregator } from './aggregator/errorAggregator';
import type { SessionStore } from './auth/oauthHandler';
import type { AuditLogRepository } from './auth/rbac';
import type { UserRepository, RetentionPolicyRepository } from './api/adminRouter';
import type { AlertRuleRepository } from './api/alertsRouter';
import type { SavedFilterRepository } from './api/filtersRouter';
import type { LogSearchRepository, BreakExportRepository } from './api/logsRouter';
import type { BreakRepository as BreaksRouterRepo, LogRepository as BreaksLogRepo } from './api/breaksRouter';
import type { DashboardRepository } from './api/dashboardRouter';
import type { BreakGroupRepository, BreakRepository as AggBreakRepo, SearchIndexer } from './aggregator/errorAggregator';

// Session store stub (no real OAuth in dev)
const sessionStore: SessionStore = {
  get: async (_token: string) => null,
  set: async (_token: string, _session: unknown) => {},
  delete: async (_token: string) => {},
};

// Audit log stub
const auditLogRepo: AuditLogRepository = {
  log: async (_entry: unknown) => {},
};

// User repository (DB-backed)
const userRepository: UserRepository = {
  findAll: async () => {
    const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    return rows;
  },
  create: async (user) => {
    const { rows } = await pool.query(
      'INSERT INTO users (email, role, oauth_provider, oauth_subject) VALUES ($1, $2, $3, $4) RETURNING *',
      [user.email, user.role, user.oauthProvider, user.oauthSubject],
    );
    return rows[0];
  },
  update: async (id, user) => {
    const fields = Object.entries(user).map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values = Object.values(user);
    const { rows } = await pool.query(
      `UPDATE users SET ${fields} WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    return rows[0] ?? null;
  },
  delete: async (id) => {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  },
};

// Retention policy repository (DB-backed)
const retentionPolicyRepository: RetentionPolicyRepository = {
  findAll: async () => {
    const { rows } = await pool.query('SELECT * FROM retention_policies');
    return rows;
  },
  upsert: async (policy) => {
    const { rows } = await pool.query(
      `INSERT INTO retention_policies (application_id, retention_days)
       VALUES ($1, $2)
       ON CONFLICT (application_id) DO UPDATE SET retention_days = EXCLUDED.retention_days
       RETURNING *`,
      [policy.applicationId, policy.retentionDays],
    );
    return rows[0];
  },
};

// Alert rule repository (DB-backed)
const alertRuleRepository: AlertRuleRepository = {
  create: async (rule) => {
    const { rows } = await pool.query(
      `INSERT INTO alert_rules (name, threshold, window_seconds, trigger_on_new_error, channels, created_by, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [rule.name, rule.threshold, rule.windowSeconds, rule.triggerOnNewError, JSON.stringify(rule.channels), rule.createdBy, rule.enabled ?? true],
    );
    return rows[0];
  },
  findAll: async () => {
    const { rows } = await pool.query('SELECT * FROM alert_rules ORDER BY created_at DESC');
    return rows;
  },
  findById: async (id) => {
    const { rows } = await pool.query('SELECT * FROM alert_rules WHERE id = $1', [id]);
    return rows[0] ?? null;
  },
  update: async (id, rule) => {
    const fields = Object.entries(rule).map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values = Object.values(rule);
    const { rows } = await pool.query(
      `UPDATE alert_rules SET ${fields} WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    return rows[0] ?? null;
  },
  delete: async (id) => {
    const { rowCount } = await pool.query('DELETE FROM alert_rules WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  },
};

// Saved filter repository (DB-backed)
const savedFilterRepository: SavedFilterRepository = {
  create: async (filter) => {
    const { rows } = await pool.query(
      `INSERT INTO saved_filters (user_id, name, criteria)
       VALUES ($1, $2, $3) RETURNING *`,
      [filter.userId, filter.name, JSON.stringify(filter.criteria)],
    );
    return rows[0];
  },
  findById: async (id) => {
    const { rows } = await pool.query('SELECT * FROM saved_filters WHERE id = $1', [id]);
    return rows[0] ?? null;
  },
  update: async (id, filter) => {
    const fields = Object.entries(filter).map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values = Object.values(filter);
    const { rows } = await pool.query(
      `UPDATE saved_filters SET ${fields} WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    return rows[0] ?? null;
  },
  delete: async (id) => {
    const { rowCount } = await pool.query('DELETE FROM saved_filters WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  },
};

// Log search repository (DB-backed)
const logSearchRepository: LogSearchRepository = {
  search: async (filters) => {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters.keyword) { conditions.push(`message ILIKE $${idx++}`); values.push(`%${filters.keyword}%`); }
    if (filters.severity) { conditions.push(`severity = $${idx++}`); values.push(filters.severity); }
    if (filters.applicationId) { conditions.push(`application_id = $${idx++}`); values.push(filters.applicationId); }
    if (filters.environment) { conditions.push(`environment = $${idx++}`); values.push(filters.environment); }
    if (filters.from) { conditions.push(`timestamp >= $${idx++}`); values.push(filters.from); }
    if (filters.to) { conditions.push(`timestamp <= $${idx++}`); values.push(filters.to); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (filters.page - 1) * filters.limit;

    const [dataRes, countRes] = await Promise.all([
      pool.query(`SELECT * FROM logs ${where} ORDER BY timestamp DESC LIMIT $${idx} OFFSET $${idx + 1}`, [...values, filters.limit, offset]),
      pool.query(`SELECT COUNT(*) FROM logs ${where}`, values),
    ]);

    return { data: dataRes.rows, total: parseInt(countRes.rows[0].count, 10) };
  },
  searchAll: async (filters) => {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters.keyword) { conditions.push(`message ILIKE $${idx++}`); values.push(`%${filters.keyword}%`); }
    if (filters.severity) { conditions.push(`severity = $${idx++}`); values.push(filters.severity); }
    if (filters.applicationId) { conditions.push(`application_id = $${idx++}`); values.push(filters.applicationId); }
    if (filters.environment) { conditions.push(`environment = $${idx++}`); values.push(filters.environment); }
    if (filters.from) { conditions.push(`timestamp >= $${idx++}`); values.push(filters.from); }
    if (filters.to) { conditions.push(`timestamp <= $${idx++}`); values.push(filters.to); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`SELECT * FROM logs ${where} ORDER BY timestamp DESC`, values);
    return rows;
  },
};

// Break export repository (DB-backed)
const breakExportRepository: BreakExportRepository = {
  exportAll: async (filters) => {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters.severity) { conditions.push(`severity = $${idx++}`); values.push(filters.severity); }
    if (filters.applicationId) { conditions.push(`application_id = $${idx++}`); values.push(filters.applicationId); }
    if (filters.from) { conditions.push(`timestamp >= $${idx++}`); values.push(filters.from); }
    if (filters.to) { conditions.push(`timestamp <= $${idx++}`); values.push(filters.to); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`SELECT * FROM breaks ${where} ORDER BY timestamp DESC`, values);
    return rows;
  },
};

// Breaks router repository (DB-backed)
const breakRepository: BreaksRouterRepo = {
  findAll: async (filters) => {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters.status) { conditions.push(`status = $${idx++}`); values.push(filters.status); }
    if (filters.severity) { conditions.push(`severity = $${idx++}`); values.push(filters.severity); }
    if (filters.applicationId) { conditions.push(`application_id = $${idx++}`); values.push(filters.applicationId); }
    if (filters.from) { conditions.push(`timestamp >= $${idx++}`); values.push(filters.from); }
    if (filters.to) { conditions.push(`timestamp <= $${idx++}`); values.push(filters.to); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (filters.page - 1) * filters.limit;

    const [dataRes, countRes] = await Promise.all([
      pool.query(`SELECT * FROM breaks ${where} ORDER BY timestamp DESC LIMIT $${idx} OFFSET $${idx + 1}`, [...values, filters.limit, offset]),
      pool.query(`SELECT COUNT(*) FROM breaks ${where}`, values),
    ]);

    return { data: dataRes.rows, total: parseInt(countRes.rows[0].count, 10) };
  },
  findById: async (id) => {
    const { rows } = await pool.query('SELECT * FROM breaks WHERE id = $1', [id]);
    return rows[0] ?? null;
  },
};

const correlatedLogRepository: BreaksLogRepo = {
  findCorrelated: async (applicationId, from, to) => {
    const { rows } = await pool.query(
      'SELECT * FROM logs WHERE application_id = $1 AND timestamp BETWEEN $2 AND $3 ORDER BY timestamp',
      [applicationId, from, to],
    );
    return rows;
  },
};

// Dashboard repository (DB-backed)
const dashboardRepository: DashboardRepository = {
  countBreaks: async (windowHours) => {
    const { rows } = await pool.query(
      `SELECT COUNT(*) FROM breaks WHERE timestamp >= NOW() - INTERVAL '${windowHours} hours'`,
    );
    return parseInt(rows[0].count, 10);
  },
  getErrorRateTrend: async (windowHours, bucketHours) => {
    const { rows } = await pool.query(
      `SELECT date_trunc('hour', timestamp) AS timestamp, COUNT(*) AS count
       FROM breaks
       WHERE timestamp >= NOW() - INTERVAL '${windowHours} hours'
       GROUP BY 1 ORDER BY 1`,
    );
    return rows.map((r: any) => ({ timestamp: r.timestamp, count: parseInt(r.count, 10) }));
  },
  getTopServices: async (limit) => {
    const { rows } = await pool.query(
      `SELECT application_id AS "applicationId", COUNT(*) AS count
       FROM breaks GROUP BY 1 ORDER BY 2 DESC LIMIT $1`,
      [limit],
    );
    return rows.map((r: any) => ({ applicationId: r.applicationId, count: parseInt(r.count, 10) }));
  },
  getTimeSeries: async (granularity, from, to) => {
    const trunc = granularity === 'daily' ? 'day' : 'hour';
    const { rows } = await pool.query(
      `SELECT date_trunc('${trunc}', timestamp) AS timestamp, COUNT(*) AS count
       FROM breaks WHERE timestamp BETWEEN $1 AND $2 GROUP BY 1 ORDER BY 1`,
      [from, to],
    );
    return rows.map((r: any) => ({ timestamp: r.timestamp, count: parseInt(r.count, 10) }));
  },
  getSeverityBreakdown: async () => {
    const { rows } = await pool.query(
      'SELECT severity, COUNT(*) AS count FROM breaks GROUP BY severity',
    );
    return Object.fromEntries(rows.map((r: any) => [r.severity, parseInt(r.count, 10)]));
  },
};

// Error aggregator repositories (stubs — replace with DB when ready)
const breakGroupRepository: BreakGroupRepository = {
  findByFingerprint: async (_fp) => null,
  save: async (group) => group,
  update: async (group) => group,
};

const aggBreakRepository: AggBreakRepo = {
  save: async (_b) => {},
};

const searchIndexer: SearchIndexer = {
  indexBreak: async (_b) => {},
  indexBreakGroup: async (_g) => {},
};

const errorAggregator = new DefaultErrorAggregator(
  breakGroupRepository,
  aggBreakRepository,
  searchIndexer,
);

// ─── Mount routers ────────────────────────────────────────────────────────────

const rbac = createRbacMiddleware(sessionStore, auditLogRepo) as any;

app.use('/api/ingest', createIngestRouter(logPipeline, errorAggregator, parseErrorRepository, process.env.API_KEY));
// Project-specific dashboard endpoints (no auth — internal monitoring)
app.use('/api/dashboard', createProjectDashboardRouter(pool));
// Breaks grouped endpoint (no auth)
app.use('/api/breaks', createProjectDashboardRouter(pool));
// Per-project error upsert (no auth — called by project services)
app.use('/api/projects', createProjectErrorUpsertRouter(pool));

// GET /api/projects?category=... — list projects from DB
app.get('/api/projects', async (req: any, res: any) => {
  try {
    const { category } = req.query as { category?: string };
    const { rows } = category
      ? await pool.query('SELECT id, name, category FROM projects WHERE category = $1 ORDER BY name', [category])
      : await pool.query('SELECT id, name, category FROM projects ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error('[Projects] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects/:name/logs — project detail stats from its individual table
app.get('/api/projects/:name/logs', async (req: any, res: any) => {
  try {
    const projectName: string = decodeURIComponent(req.params.name);

    // Derive table name: spaces→underscores, keep special chars as-is
    const tableName = projectName.replace(/ /g, '_');

    // Check the table exists in information_schema
    const { rows: tableCheck } = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1`,
      [tableName],
    );

    if (tableCheck.length === 0) {
      return res.json({ exists: false, tableName, total: 0, filesProcessed: 0, success: 0, failure: 0, totalCost: null, errors: [], logs: [] });
    }

    // Fetch all rows ordered by timestamp desc
    const { rows: logs } = await pool.query(
      `SELECT file_name, timestamp, success_count, failure_count, error,
              llm_usage, input_tokens, output_tokens, calculated_cost, word_count, file_type,
              error_status, resolved_at, reopened_at
       FROM "${tableName}"
       ORDER BY timestamp DESC
       LIMIT 500`,
    );

    const total = logs.length;
    const filesProcessed = total;
    const success = logs.filter((r: any) => !r.error || r.error === '').length;
    const failure = logs.filter((r: any) => r.error && r.error !== '' && r.error_status !== 'resolved').length;

    const rawCost = logs.reduce((sum: number, r: any) => sum + (parseFloat(r.calculated_cost) || 0), 0);
    const totalCost = rawCost > 0 ? `$${rawCost.toFixed(4)}` : null;

    const errors = logs
      .filter((r: any) => r.error && r.error !== '' && (r.error_status === 'open' || r.error_status === 'reopened'))
      .map((r: any) => ({ timestamp: r.timestamp, message: r.error }));

    // Filter resolved rows out of the logs returned to the UI
    const visibleLogs = logs.map((r: any) => ({
      ...r,
      // treat resolved errors as no-error for display purposes
      error: (r.error_status === 'resolved') ? null : r.error,
    }));

    res.json({ exists: true, tableName, total, filesProcessed, success, failure, totalCost, errors, logs: visibleLogs });
  } catch (err) {
    console.error('[Projects] logs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.use('/api/logs', createLogsRouterSync(logSearchRepository, breakExportRepository, sessionStore, auditLogRepo, rbac));
app.use('/api/breaks', createBreaksRouterSync(breakRepository, correlatedLogRepository, sessionStore, auditLogRepo, rbac, breakExportRepository));
app.use('/api/dashboard', createDashboardRouterSync(dashboardRepository, sessionStore, auditLogRepo, rbac));
app.use('/api/alerts', createAlertsRouterSync(alertRuleRepository, sessionStore, auditLogRepo, rbac));
app.use('/api/filters', createFiltersRouterSync(savedFilterRepository, sessionStore, auditLogRepo, rbac));
app.use('/api/admin', createAdminRouterSync(userRepository, retentionPolicyRepository, sessionStore, auditLogRepo, rbac));

// ─── HTTP server + WebSocket ──────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3001', 10);

const server = app.listen(PORT, () => {
  console.log(`[Server] listening on http://localhost:${PORT}`);
  console.log(`[Server] API docs at http://localhost:${PORT}/api/docs`);
});

// Attach native ws upgrade to the WebSocket server
const wss = new WS.Server({ noServer: true });

server.on('upgrade', (request: any, socket: any, head: any) => {
  wss.handleUpgrade(request, socket, head, (ws: any) => {
    const client = {
      isAlive: true,
      send: (data: string) => ws.send(data),
    };
    wsServer.addClient(client);
    ws.on('close', () => wsServer.removeClient(client));
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down…');
  server.close(() => {
    pool.end();
    process.exit(0);
  });
});

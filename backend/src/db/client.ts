/**
 * Aurora DSQL database pool.
 *
 * Uses the official @aws/aurora-dsql-node-postgres-connector which:
 *  - Automatically generates IAM auth tokens on every connection
 *  - Auto-refreshes tokens before they expire (15-min lifetime)
 *  - Enforces SSL (required by Aurora DSQL, cannot be disabled)
 *  - Works with Lambda execution role — no static credentials needed
 *
 * Required environment variables (set in Lambda → Configuration → Environment variables):
 *   DSQL_ENDPOINT  — e.g. ezt2bkam5s4kjre73r25easkcu.dsql.us-east-1.on.aws
 *   DSQL_REGION    — e.g. us-east-1
 */

import { Pool } from 'pg';
import { AuroraDSQLPool } from '@aws/aurora-dsql-node-postgres-connector';

const DSQL_ENDPOINT = process.env.DSQL_ENDPOINT ?? '';
const DSQL_REGION = process.env.DSQL_REGION ?? 'us-east-1';

if (!DSQL_ENDPOINT) {
  console.error('[DB] DSQL_ENDPOINT environment variable is not set. Set it in Lambda → Configuration → Environment variables.');
}

console.log(`[DB] Connecting to Aurora DSQL: ${DSQL_ENDPOINT}`);

/**
 * AuroraDSQLPool — extends pg.Pool with automatic IAM token generation.
 * In Lambda, the execution role provides credentials automatically.
 * No password, no DATABASE_URL, no manual token rotation needed.
 */
export const pool: Pool = new AuroraDSQLPool({
  host: DSQL_ENDPOINT,
  user: 'admin',        // 'admin' triggers admin-level IAM token
  database: 'postgres',     // Aurora DSQL has one built-in DB: postgres
  port: 5432,
  region: DSQL_REGION,
  max: 5,              // small pool — Lambda concurrency is limited
  idleTimeoutMillis: 10_000,         // release idle connections quickly between invocations
  connectionTimeoutMillis: 5_000,          // fail fast on cold starts rather than hanging
}) as unknown as Pool;

pool.on('connect', () => {
  console.log('[DB] Aurora DSQL connection established');
});

pool.on('error', (err) => {
  console.error('[DB] Aurora DSQL pool error:', err.message);
});

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
export declare function createGetErrorDetailHandler(pool: Pool): (req: any, res: any) => Promise<any>;
export declare function createProjectDashboardRouter(pool: Pool): any;
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
export declare function createProjectErrorUpsertRouter(pool: Pool): any;
/**
 * Live-project management + test sample-error injection router.
 *
 * PATCH /api/projects/:name/live          — toggle is_live on/off
 * GET   /api/projects/live                — list all live projects
 * POST  /api/projects/:name/test-error    — inject a sample error for testing
 *        Body: { error?, error_detail?, file_name? }
 *        Only works when NODE_ENV !== 'production' OR query ?force=1
 *        Sends a real Teams alert so you can verify the channel end-to-end.
 */
export declare function createProjectLiveRouter(pool: Pool): any;

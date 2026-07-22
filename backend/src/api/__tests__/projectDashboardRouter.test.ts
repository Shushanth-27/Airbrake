import { Pool } from 'pg';
import { createGetErrorDetailHandler } from '../projectDashboardRouter';

function makeRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
    },
  };
  return res;
}

describe('GET /api/breaks/detail/:errorHash', () => {
  it('returns the stored error detail for a matching hash', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [{ table_name: 'toc_extractor' }] })
      .mockResolvedValueOnce({
        rows: [{
          project_name: 'toc_extractor',
          file_name: 'parser.py',
          error_message: 'TOC not found',
          error_detail: 'Traceback: missing TOC section',
          error_hash: 'abc123',
          timestamp: '2024-01-15T12:00:00Z',
          error_status: 'open',
          failure_count: 2,
          reopened_at: null,
        }],
      });

    const handler = createGetErrorDetailHandler({ query } as unknown as Pool);
    const res = makeRes();

    await handler({
      params: { errorHash: 'abc123' },
      query: { project_name: 'toc_extractor' },
    } as any, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      project_name: 'toc_extractor',
      error_message: 'TOC not found',
      error_detail: 'Traceback: missing TOC section',
      error_hash: 'abc123',
      occurrence_count: 2,
      status: 'existing',
    });
  });
});

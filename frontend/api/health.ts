import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureInit } from '../lib/db';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const t0 = Date.now();

  // Test DB connection
  let db: 'ok' | string = 'ok';
  try {
    const client = await ensureInit();
    await client.execute('SELECT 1');
  } catch (err) {
    db = err instanceof Error ? err.message : String(err);
  }

  return res.status(db === 'ok' ? 200 : 503).json({
    status: db === 'ok' ? 'ok' : 'degraded',
    db,
    latencyMs: Date.now() - t0,
  });
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureInit } from '../lib/db';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const t0 = Date.now();
  try {
    const db = await ensureInit();
    await db.execute('SELECT 1');
    return res.status(200).json({ status: 'ok', db: 'ok', latencyMs: Date.now() - t0 });
  } catch (err) {
    return res.status(200).json({
      status: 'ok',
      db: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - t0,
    });
  }
}

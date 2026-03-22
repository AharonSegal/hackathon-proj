import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureInit, rowToLog } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await ensureInit();
    const result = await db.execute(
      'SELECT * FROM message_logs ORDER BY scheduled_at DESC LIMIT 200',
    );
    return res.status(200).json(
      result.rows.map(r => rowToLog(r as Record<string, unknown>)),
    );
  } catch (err) {
    console.error('[GET /api/messages/logs]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

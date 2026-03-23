/**
 * api/worklog/preferences.ts
 * ----------------------------
 * Vercel serverless handler for Daily Log UI preferences.
 *
 * Preferences are a free-form JSON object stored under id='default' in the
 * worklog_preferences table. Currently used to persist any UI state the
 * SchemaManager or LogEntry form wants to remember across sessions.
 *
 * Endpoints:
 * GET /api/worklog/preferences — returns parsed preferences JSON, or null
 * PUT /api/worklog/preferences — upserts preferences document
 *                                returns { ok: true } on success
 *
 * Storage: uses SQLite's ON CONFLICT DO UPDATE for atomic upsert.
 * No default seed — returns null until the first PUT from the frontend.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureInit } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await ensureInit();

    if (req.method === 'GET') {
      const result = await db.execute({ sql: 'SELECT data FROM worklog_preferences WHERE id = ?', args: ['default'] });
      if (result.rows.length === 0) return res.status(200).json(null);
      const row = result.rows[0] as Record<string, unknown>;
      try {
        return res.status(200).json(JSON.parse(row.data as string));
      } catch {
        return res.status(200).json(null);
      }
    }

    if (req.method === 'PUT') {
      const data = JSON.stringify(req.body ?? null);
      await db.execute({
        sql: 'INSERT INTO worklog_preferences (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
        args: ['default', data],
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[/api/worklog/preferences]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

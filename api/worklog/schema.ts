/**
 * api/worklog/schema.ts
 * -----------------------
 * Vercel serverless handler for the user-defined worklog schema.
 *
 * The schema is a single JSON document stored under id='default' in the
 * worklog_schema table. It defines the available projects, categories,
 * and technology options that populate the log entry form.
 *
 * Endpoints:
 * GET /api/worklog/schema — returns parsed schema JSON, or null if not seeded
 * PUT /api/worklog/schema — upserts (INSERT OR UPDATE) the schema document
 *                           returns { ok: true } on success
 *
 * Storage: uses SQLite's ON CONFLICT DO UPDATE for atomic upsert.
 * The default schema is seeded by ensureInit() in lib/db.ts.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureInit } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await ensureInit();

    if (req.method === 'GET') {
      const result = await db.execute({ sql: 'SELECT data FROM worklog_schema WHERE id = ?', args: ['default'] });
      if (result.rows.length === 0) return res.status(200).json(null);
      const row = result.rows[0] as Record<string, unknown>;
      try {
        return res.status(200).json(JSON.parse(row.data as string));
      } catch {
        return res.status(200).json(null);
      }
    }

    if (req.method === 'PUT') {
      const data = JSON.stringify(req.body ?? {});
      await db.execute({
        sql: 'INSERT INTO worklog_schema (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
        args: ['default', data],
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[/api/worklog/schema]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

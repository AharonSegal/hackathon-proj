/**
 * api/worklog/entries/[id].ts
 * -----------------------------
 * Vercel serverless handler for a single worklog entry by ID.
 *
 * Endpoints:
 * GET    /api/worklog/entries/:id — fetch one entry; 404 if not found
 * PUT    /api/worklog/entries/:id — full-replace update; body must include `title`
 *                                   returns 200 + updated WorklogEntry
 * DELETE /api/worklog/entries/:id — hard-delete single entry; returns 204
 *
 * The `id` path segment is provided by Vercel's file-system routing from
 * the `[id].ts` filename convention.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureInit, rowToWorklogEntry } from '../../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await ensureInit();
    const { id } = req.query as { id: string };

    if (req.method === 'GET') {
      const result = await db.execute({ sql: 'SELECT * FROM worklog_entries WHERE id = ?', args: [id] });
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(rowToWorklogEntry(result.rows[0] as Record<string, unknown>));
    }

    if (req.method === 'PUT') {
      const b = req.body ?? {};
      if (!b.title) return res.status(400).json({ error: 'title is required' });
      await db.execute({
        sql: `UPDATE worklog_entries SET
              date = ?, day_number = ?, project = ?, categories = ?, title = ?,
              description = ?, technologies = ?, team_type = ?, team_size = ?,
              coding_languages = ?
              WHERE id = ?`,
        args: [
          b.date,
          b.dayNumber ?? 1,
          b.project ?? '',
          JSON.stringify(b.categories ?? []),
          String(b.title),
          b.description ?? null,
          JSON.stringify(b.technologies ?? []),
          b.teamType ?? 'solo',
          b.teamSize ?? null,
          JSON.stringify(b.codingLanguages ?? []),
          id,
        ],
      });
      const row = await db.execute({ sql: 'SELECT * FROM worklog_entries WHERE id = ?', args: [id] });
      if (row.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(rowToWorklogEntry(row.rows[0] as Record<string, unknown>));
    }

    if (req.method === 'DELETE') {
      await db.execute({ sql: 'DELETE FROM worklog_entries WHERE id = ?', args: [id] });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[/api/worklog/entries/[id]]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

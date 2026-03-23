/**
 * api/worklog/entries/index.ts
 * ------------------------------
 * Vercel serverless handler for the worklog entries collection endpoint.
 *
 * Endpoints:
 * GET    /api/worklog/entries  — list all entries ordered by date DESC
 *                                returns WorklogEntry[] (camelCase via rowToWorklogEntry)
 * POST   /api/worklog/entries  — create a new entry; body must include `title`
 *                                returns 201 + the created WorklogEntry
 * DELETE /api/worklog/entries  — hard-delete ALL entries (used by clearAllData)
 *                                returns 204 No Content
 *
 * Performance: query uses idx_worklog_entries_date index (created in ensureInit).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { ensureInit, rowToWorklogEntry } from '../../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await ensureInit();

    if (req.method === 'GET') {
      const result = await db.execute('SELECT * FROM worklog_entries ORDER BY date DESC, created_at DESC');
      return res.status(200).json(result.rows.map(r => rowToWorklogEntry(r as Record<string, unknown>)));
    }

    if (req.method === 'POST') {
      const b = req.body ?? {};
      if (!b.title) return res.status(400).json({ error: 'title is required' });
      const id = String(b.id ?? randomUUID());
      const now = new Date().toISOString();
      await db.execute({
        sql: `INSERT INTO worklog_entries
              (id, date, day_number, project, categories, title, description, technologies, team_type, team_size, coding_languages, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          b.date ?? now.split('T')[0],
          b.dayNumber ?? 1,
          b.project ?? '',
          JSON.stringify(b.categories ?? []),
          String(b.title),
          b.description ?? null,
          JSON.stringify(b.technologies ?? []),
          b.teamType ?? 'solo',
          b.teamSize ?? null,
          JSON.stringify(b.codingLanguages ?? []),
          b.createdAt ?? now,
        ],
      });
      const row = await db.execute({ sql: 'SELECT * FROM worklog_entries WHERE id = ?', args: [id] });
      return res.status(201).json(rowToWorklogEntry(row.rows[0] as Record<string, unknown>));
    }

    if (req.method === 'DELETE') {
      await db.execute('DELETE FROM worklog_entries');
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[/api/worklog/entries]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * api/events/[id].ts — PUT + DELETE /api/events/:id
 * ---------------------------------------------------
 * Update or delete a specific calendar event.
 *
 * PUT    /api/events/:id — partial update (only fields in the request body are changed)
 * DELETE /api/events/:id — deletes the event, returns HTTP 204
 *
 * Both methods return 404 if the event does not exist.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureInit, rowToEvent } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await ensureInit();
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing event id' });
    }

    // Fetch current row once — used for both PUT (merge) and DELETE (existence check)
    const existing = await db.execute({
      sql: 'SELECT * FROM events WHERE id = ?',
      args: [id],
    });

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // ── PUT /api/events/:id ──────────────────────────────────────────────────
    if (req.method === 'PUT') {
      const cur = existing.rows[0] as Record<string, unknown>;
      const b   = req.body ?? {};

      // Only override a field if the request body explicitly includes it
      const title       = 'title'       in b ? b.title       : cur.title;
      const description = 'description' in b ? b.description : cur.description;
      const date        = 'date'        in b ? b.date        : cur.date;
      const startTime   = 'startTime'   in b ? b.startTime   : cur.start_time;
      const endTime     = 'endTime'     in b ? b.endTime     : cur.end_time;
      const color       = 'color'       in b ? b.color       : cur.color;
      const allDay      = 'allDay'      in b ? b.allDay      : Boolean(cur.all_day);

      let seJson: string | null = cur.scheduled_email as string | null;
      if ('scheduledEmail' in b) {
        seJson = b.scheduledEmail ? JSON.stringify(b.scheduledEmail) : null;
      }

      let swJson: string | null = cur.scheduled_whatsapp as string | null;
      if ('scheduledWhatsApp' in b) {
        swJson = b.scheduledWhatsApp ? JSON.stringify(b.scheduledWhatsApp) : null;
      }

      const now = new Date().toISOString();

      await db.execute({
        sql: `UPDATE events SET
              title = ?, description = ?, date = ?,
              start_time = ?, end_time = ?, color = ?, all_day = ?,
              scheduled_email = ?, scheduled_whatsapp = ?,
              updated_at = ?
              WHERE id = ?`,
        args: [
          title,
          description ?? null,
          date,
          startTime ?? null,
          endTime   ?? null,
          color,
          allDay ? 1 : 0,
          seJson,
          swJson,
          now,
          id,
        ],
      });

      const updated = await db.execute({
        sql: 'SELECT * FROM events WHERE id = ?',
        args: [id],
      });
      return res.status(200).json(rowToEvent(updated.rows[0] as Record<string, unknown>));
    }

    // ── DELETE /api/events/:id ───────────────────────────────────────────────
    if (req.method === 'DELETE') {
      await db.execute({ sql: 'DELETE FROM events WHERE id = ?', args: [id] });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[PUT|DELETE /api/events/[id]]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

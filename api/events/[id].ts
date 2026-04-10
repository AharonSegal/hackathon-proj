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
import { randomUUID } from 'node:crypto';
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
      sql: 'SELECT * FROM events WHERE id = ? AND deleted_at IS NULL',
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

      const tags = 'tags' in b ? JSON.stringify(Array.isArray(b.tags) ? b.tags : []) : String(cur.tags ?? '[]');
      const folderId = 'folderId' in b ? (b.folderId === null ? null : String(b.folderId)) : ((cur.folder_id as string | null) ?? null);
      const recurrence = 'recurrence' in b ? String(b.recurrence) : String(cur.recurrence ?? 'none');
      const recurrenceEnd = 'recurrenceEnd' in b ? (b.recurrenceEnd ? String(b.recurrenceEnd) : null) : ((cur.recurrence_end as string | null) ?? null);
      const notifications = 'notifications' in b
        ? JSON.stringify(Array.isArray(b.notifications) ? b.notifications : [])
        : String(cur.notifications ?? '[]');

      const now = new Date().toISOString();

      await db.execute({
        sql: `UPDATE events SET
              title = ?, description = ?, date = ?,
              start_time = ?, end_time = ?, color = ?, all_day = ?,
              scheduled_email = ?, scheduled_whatsapp = ?,
              tags = ?, folder_id = ?, recurrence = ?, recurrence_end = ?,
              notifications = ?,
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
          tags,
          folderId,
          recurrence,
          recurrenceEnd,
          notifications,
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

    // ── DELETE /api/events/:id — soft delete ─────────────────────────────────
    if (req.method === 'DELETE') {
      const now = new Date().toISOString();
      await db.execute({ sql: 'UPDATE events SET deleted_at = ? WHERE id = ?', args: [now, id] });
      await db.execute({
        sql: 'INSERT INTO trash (id, entity_id, entity_type, deleted_at) VALUES (?, ?, ?, ?)',
        args: [randomUUID(), id, 'event', now],
      });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[PUT|DELETE /api/events/[id]]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

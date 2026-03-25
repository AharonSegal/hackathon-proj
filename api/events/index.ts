/**
 * api/events/index.ts — GET + POST /api/events
 * -----------------------------------------------
 * List and create calendar events.
 *
 * GET  /api/events              — returns all events ordered by date
 * GET  /api/events?year=&month= — returns events for a specific month
 * POST /api/events              — creates a new event, returns the created row
 *
 * Required POST fields: title (string), date (YYYY-MM-DD)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { ensureInit, rowToEvent } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await ensureInit();

    // ── GET /api/events[?year=&month=] ──────────────────────────────────────
    if (req.method === 'GET') {
      const { year, month } = req.query;

      let sql  = 'SELECT * FROM events WHERE deleted_at IS NULL';
      const args: string[] = [];

      if (year && month) {
        const y = String(year).padStart(4, '0');
        const m = String(month).padStart(2, '0');
        sql += ' AND date LIKE ?';
        args.push(`${y}-${m}%`);
      }
      sql += ' ORDER BY date ASC';

      const result = await db.execute({ sql, args });
      return res.status(200).json(
        result.rows.map(r => rowToEvent(r as Record<string, unknown>)),
      );
    }

    // ── POST /api/events ─────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const {
        title, description, date,
        startTime, endTime,
        color = 'indigo', allDay = true,
        scheduledEmail, scheduledWhatsApp,
        tags = [], folderId = null, recurrence = 'none', recurrenceEnd = null,
      } = req.body ?? {};

      if (!title || !date) {
        return res.status(400).json({ error: 'title and date are required' });
      }

      const id  = randomUUID();
      const now = new Date().toISOString();

      await db.execute({
        sql: `INSERT INTO events
              (id, title, description, date, start_time, end_time, color, all_day,
               scheduled_email, scheduled_whatsapp,
               tags, folder_id, recurrence, recurrence_end,
               created_at, updated_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          id,
          String(title),
          description ?? null,
          String(date),
          startTime  ?? null,
          endTime    ?? null,
          color,
          allDay ? 1 : 0,
          scheduledEmail    ? JSON.stringify(scheduledEmail)    : null,
          scheduledWhatsApp ? JSON.stringify(scheduledWhatsApp) : null,
          JSON.stringify(Array.isArray(tags) ? tags : []),
          folderId ?? null,
          recurrence ?? 'none',
          recurrenceEnd ?? null,
          now,
          now,
        ],
      });

      const row = await db.execute({
        sql: 'SELECT * FROM events WHERE id = ?',
        args: [id],
      });
      if (row.rows.length === 0) return res.status(500).json({ error: 'Failed to create event' });
      return res.status(201).json(rowToEvent(row.rows[0] as Record<string, unknown>));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[GET|POST /api/events]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

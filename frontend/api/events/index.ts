import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureInit, rowToEvent } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await ensureInit();

    // ── GET /api/events[?year=&month=] ──────────────────────────────────────
    if (req.method === 'GET') {
      const { year, month } = req.query;

      let sql  = 'SELECT * FROM events';
      const args: string[] = [];

      if (year && month) {
        const y = String(year).padStart(4, '0');
        const m = String(month).padStart(2, '0');
        sql += ' WHERE date LIKE ?';
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
      } = req.body ?? {};

      if (!title || !date) {
        return res.status(400).json({ error: 'title and date are required' });
      }

      const id  = crypto.randomUUID();
      const now = new Date().toISOString();

      await db.execute({
        sql: `INSERT INTO events
              (id, title, description, date, start_time, end_time, color, all_day,
               scheduled_email, scheduled_whatsapp, created_at, updated_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
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
          now,
          now,
        ],
      });

      const row = await db.execute({
        sql: 'SELECT * FROM events WHERE id = ?',
        args: [id],
      });
      return res.status(201).json(rowToEvent(row.rows[0] as Record<string, unknown>));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[GET|POST /api/events]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

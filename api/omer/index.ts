/**
 * api/omer/index.ts
 * ------------------
 * GET  /api/omer — returns today's Omer counting status; auto-rolls over on new day
 * POST /api/omer — body: { action: 'count' | 'dismiss' }
 *
 * Stores a single singleton row in the omer_status table.
 * Day rollover logic: when the stored last_date differs from today,
 * shift counted_today → counted_yesterday and reset counted_today + dismissed_date.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureInit } from '../../lib/db';

type Row = Record<string, unknown>;

function rowToOmerStatus(row: Row) {
  return {
    lastDate:         (row.last_date as string) ?? '',
    countedToday:     Boolean(row.counted_today),
    countedYesterday: Boolean(row.counted_yesterday),
    dismissedDate:    (row.dismissed_date as string) ?? '',
  };
}

const SINGLETON_ID = 'singleton';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db  = await ensureInit();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    if (req.method === 'GET') {
      const result = await db.execute({
        sql:  'SELECT * FROM omer_status WHERE id = ?',
        args: [SINGLETON_ID],
      });

      // Should always exist (seeded on init), but guard anyway
      if (result.rows.length === 0) {
        await db.execute({
          sql:  `INSERT INTO omer_status (id, last_date, counted_today, counted_yesterday, dismissed_date)
                 VALUES (?, ?, 0, 0, '')`,
          args: [SINGLETON_ID, today],
        });
        return res.status(200).json({
          lastDate: today, countedToday: false, countedYesterday: false, dismissedDate: '',
        });
      }

      const row      = result.rows[0] as Row;
      const lastDate = (row.last_date as string) ?? '';

      // New-day rollover
      if (lastDate !== today) {
        const wasCountedToday = Boolean(row.counted_today);
        await db.execute({
          sql:  `UPDATE omer_status
                 SET last_date = ?, counted_today = 0, counted_yesterday = ?, dismissed_date = ''
                 WHERE id = ?`,
          args: [today, wasCountedToday ? 1 : 0, SINGLETON_ID],
        });
        return res.status(200).json({
          lastDate: today,
          countedToday: false,
          countedYesterday: wasCountedToday,
          dismissedDate: '',
        });
      }

      return res.status(200).json(rowToOmerStatus(row));
    }

    if (req.method === 'POST') {
      const action = req.body?.action as string | undefined;
      if (!action) return res.status(400).json({ error: 'action is required' });

      if (action === 'count') {
        await db.execute({
          sql:  'UPDATE omer_status SET counted_today = 1 WHERE id = ?',
          args: [SINGLETON_ID],
        });
      } else if (action === 'dismiss') {
        await db.execute({
          sql:  'UPDATE omer_status SET dismissed_date = ? WHERE id = ?',
          args: [today, SINGLETON_ID],
        });
      } else {
        return res.status(400).json({ error: 'action must be "count" or "dismiss"' });
      }

      const updated = await db.execute({
        sql:  'SELECT * FROM omer_status WHERE id = ?',
        args: [SINGLETON_ID],
      });
      return res.status(200).json(rowToOmerStatus(updated.rows[0] as Row));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[/api/omer]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

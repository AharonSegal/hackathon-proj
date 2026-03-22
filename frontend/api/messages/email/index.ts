import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { ensureInit, rowToLog } from '../../../lib/db';
import { sendEmail } from '../../../lib/email';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await ensureInit();
    const { to, subject, body, scheduleAt, eventId } = req.body ?? {};

    if (!to || !Array.isArray(to) || to.length === 0 || !subject || !body) {
      return res.status(400).json({ error: 'to (array), subject, and body are required' });
    }

    const id          = randomUUID();
    const now         = new Date().toISOString();
    const scheduledAt = scheduleAt ?? now;
    const isImmediate = !scheduleAt;
    const recipient   = (to as string[]).join(', ');

    await db.execute({
      sql: `INSERT INTO message_logs
            (id, type, status, recipient, subject, message, scheduled_at, event_id, created_at)
            VALUES (?,?,?,?,?,?,?,?,?)`,
      args: [id, 'email', 'pending', recipient, String(subject), String(body), scheduledAt, eventId ?? null, now],
    });

    if (isImmediate) {
      try {
        await sendEmail(to as string[], String(subject), String(body));
        await db.execute({
          sql:  `UPDATE message_logs SET status = 'sent', sent_at = ? WHERE id = ?`,
          args: [new Date().toISOString(), id],
        });
      } catch (sendErr) {
        const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
        await db.execute({
          sql:  `UPDATE message_logs SET status = 'failed', error = ? WHERE id = ?`,
          args: [errMsg, id],
        });
        const row = await db.execute({ sql: 'SELECT * FROM message_logs WHERE id = ?', args: [id] });
        return res.status(502).json({ error: `Email send failed: ${errMsg}`, log: rowToLog(row.rows[0] as Record<string, unknown>) });
      }
    }

    const row = await db.execute({ sql: 'SELECT * FROM message_logs WHERE id = ?', args: [id] });
    return res.status(201).json(rowToLog(row.rows[0] as Record<string, unknown>));
  } catch (err) {
    console.error('[POST /api/messages/email]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

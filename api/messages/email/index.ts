/**
 * api/messages/email/index.ts — POST /api/messages/email
 * --------------------------------------------------------
 * Send an email immediately or schedule it for later.
 *
 * Required body: { to: string[] (email addresses), subject: string, body: string }
 * Optional body: { scheduleAt: ISO datetime string, eventId: string }
 *
 * Process:
 * 1. Validate email addresses (regex)
 * 2. Insert a message_logs row with status='pending'
 * 3. If no scheduleAt → send immediately via SMTP
 *    - On success: update status to 'sent'
 *    - On failure: update status to 'failed', return 502
 * 4. If scheduleAt provided → leave as 'pending' (cron will send it)
 * 5. Return the created message_log row
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { ensureInit, rowToLog } from '../../../lib/db';
import { sendEmail } from '../../../lib/email';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Test mode: POST /api/messages/email?test=true ────────────────────────
  if (req.query.test === 'true') {
    try {
      const { to } = req.body ?? {};
      if (!to) return res.status(400).json({ error: "Missing 'to' field" });
      await sendEmail([String(to)], 'Test from Calendar App', 'This is a test email from your Calendar App ✅');
      return res.status(200).json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(502).json({ error: msg });
    }
  }

  try {
    const db = await ensureInit();
    const { to, subject, body, scheduleAt, eventId } = req.body ?? {};

    if (!to || !Array.isArray(to) || to.length === 0 || !subject || !body) {
      return res.status(400).json({ error: 'to (array), subject, and body are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if ((to as string[]).some(addr => !emailRegex.test(addr))) {
      return res.status(400).json({ error: 'One or more email addresses are invalid' });
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

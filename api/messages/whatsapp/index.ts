/**
 * api/messages/whatsapp/index.ts — POST /api/messages/whatsapp
 * --------------------------------------------------------------
 * Send a WhatsApp message immediately or schedule it for later.
 *
 * Required body: { to: string (E.164), message: string }
 * Optional body: { scheduleAt: ISO datetime string, eventId: string }
 *
 * Process:
 * 1. Validate phone number format (E.164 regex)
 * 2. Insert a message_logs row with status='pending'
 * 3. If no scheduleAt → send immediately via WhatsApp API
 *    - On success: update status to 'sent'
 *    - On failure: update status to 'failed', return 502
 * 4. If scheduleAt provided → leave as 'pending' (cron will send it)
 * 5. Return the created message_log row
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { ensureInit, rowToLog } from '../../../lib/db';
import { sendWhatsApp } from '../../../lib/whatsapp';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await ensureInit();
    const { to, message, scheduleAt, eventId } = req.body ?? {};

    if (!to || !message) {
      return res.status(400).json({ error: 'to and message are required' });
    }

    if (!/^\+\d{7,15}$/.test(String(to))) {
      return res.status(400).json({ error: 'Phone number must be in E.164 format, e.g. +1234567890' });
    }

    const id          = randomUUID();
    const now         = new Date().toISOString();
    const scheduledAt = scheduleAt ?? now;
    const isImmediate = !scheduleAt;

    // Always create the log row first
    await db.execute({
      sql: `INSERT INTO message_logs
            (id, type, status, recipient, message, scheduled_at, event_id, created_at)
            VALUES (?,?,?,?,?,?,?,?)`,
      args: [id, 'whatsapp', 'pending', String(to), String(message), scheduledAt, eventId ?? null, now],
    });

    // Send immediately if no schedule time was provided
    if (isImmediate) {
      try {
        await sendWhatsApp(String(to), String(message));
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
        return res.status(502).json({ error: `WhatsApp send failed: ${errMsg}`, log: rowToLog(row.rows[0] as Record<string, unknown>) });
      }
    }

    const row = await db.execute({ sql: 'SELECT * FROM message_logs WHERE id = ?', args: [id] });
    return res.status(201).json(rowToLog(row.rows[0] as Record<string, unknown>));
  } catch (err) {
    console.error('[POST /api/messages/whatsapp]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

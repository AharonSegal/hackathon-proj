/**
 * api/cron/send-messages.ts — Vercel Cron (daily at 8am UTC)
 * ------------------------------------------------------------
 * Sends all pending scheduled messages whose send time has passed.
 *
 * Triggered automatically by Vercel Cron at 0 8 * * * (8am UTC daily).
 * Can also be triggered manually via GET or POST with the correct Authorization header.
 *
 * Security: requires Authorization: Bearer <CRON_SECRET> header.
 * Vercel sets this automatically for cron invocations.
 *
 * Process Flow:
 * 1. Verify the Authorization header (reject if CRON_SECRET doesn't match)
 * 2. Query all message_logs WHERE status='pending' AND scheduled_at <= now
 * 3. For each pending message:
 *    a. Send via WhatsApp or Email depending on log.type
 *    b. On success → update status to 'sent', set sent_at timestamp
 *    c. On failure → update status to 'failed', save error message
 * 4. Continue processing remaining messages even if one fails
 * 5. Return a summary of { processed: N, results: [...] }
 *
 * NOTE: Vercel Hobby plan only supports daily cron jobs.
 * Hourly schedules (0 * * * *) silently block all new deployments on Hobby.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureInit, rowToLog } from '../../lib/db';
import { sendWhatsApp } from '../../lib/whatsapp';
import { sendEmail } from '../../lib/email';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Vercel cron authorization when CRON_SECRET is set
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers['authorization'];
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const db  = await ensureInit();
    const now = new Date().toISOString();

    const result = await db.execute({
      sql:  `SELECT * FROM message_logs
             WHERE status = 'pending' AND scheduled_at <= ?
             ORDER BY scheduled_at ASC`,
      args: [now],
    });

    const pending = result.rows as Record<string, unknown>[];
    const results: { id: string; status: string; error?: string }[] = [];

    for (const raw of pending) {
      const log = rowToLog(raw);
      try {
        if (log.type === 'whatsapp') {
          await sendWhatsApp(log.recipient, log.message);
        } else {
          const toList = log.recipient.split(',').map(s => s.trim());
          await sendEmail(toList, log.subject ?? '(no subject)', log.message);
        }

        await db.execute({
          sql:  `UPDATE message_logs SET status = 'sent', sent_at = ? WHERE id = ?`,
          args: [new Date().toISOString(), log.id],
        });
        results.push({ id: log.id, status: 'sent' });
        console.log(`[cron] Sent ${log.type} message ${log.id} to ${log.recipient}`);
      } catch (sendErr) {
        const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
        await db.execute({
          sql:  `UPDATE message_logs SET status = 'failed', error = ? WHERE id = ?`,
          args: [errMsg, log.id],
        });
        results.push({ id: log.id, status: 'failed', error: errMsg });
        console.error(`[cron] Failed ${log.type} message ${log.id}:`, errMsg);
      }
    }

    return res.status(200).json({ processed: pending.length, results });
  } catch (err) {
    console.error('[/api/cron/send-messages]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

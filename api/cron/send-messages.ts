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

/**
 * api/messages/[...path].ts
 * --------------------------
 * Catch-all for all /api/messages/* routes (required catch-all — always has segment).
 *
 * GET  /api/messages/logs            — list message logs
 * POST /api/messages/whatsapp        — send / schedule WhatsApp
 * POST /api/messages/whatsapp?test=  — test send
 * POST /api/messages/email           — send / schedule email
 * POST /api/messages/email?test=     — test send
 * GET  /api/messages/cron            — cron trigger (send pending messages)
 * POST /api/messages/cron            — cron trigger (manual)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { ensureInit, rowToLog } from '../../lib/db';
import { sendWhatsApp } from '../../lib/whatsapp';
import { sendEmail } from '../../lib/email';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const segments = Array.isArray(req.query.path) ? req.query.path : [req.query.path as string];
  const route = segments[0];

  // ── GET /api/messages/logs ─────────────────────────────────────────────────
  if (route === 'logs') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    try {
      const db = await ensureInit();
      const result = await db.execute('SELECT * FROM message_logs ORDER BY scheduled_at DESC LIMIT 200');
      return res.status(200).json(result.rows.map(r => rowToLog(r as Record<string, unknown>)));
    } catch (err) {
      console.error('[GET /api/messages/logs]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ── POST /api/messages/whatsapp ────────────────────────────────────────────
  if (route === 'whatsapp') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (req.query.test === 'true') {
      try {
        const { to } = req.body ?? {};
        if (!to) return res.status(400).json({ error: "Missing 'to' field" });
        await sendWhatsApp(String(to), '✅ Test message from Calendar App!');
        return res.status(200).json({ ok: true });
      } catch (err) {
        return res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
      }
    }

    try {
      const db = await ensureInit();
      const { to, message, scheduleAt, eventId } = req.body ?? {};
      if (!to || !message) return res.status(400).json({ error: 'to and message are required' });
      if (!/^\+\d{7,15}$/.test(String(to)))
        return res.status(400).json({ error: 'Phone number must be in E.164 format, e.g. +1234567890' });

      const id = randomUUID();
      const now = new Date().toISOString();
      const scheduledAt = scheduleAt ?? now;

      await db.execute({
        sql: `INSERT INTO message_logs (id, type, status, recipient, message, scheduled_at, event_id, created_at) VALUES (?,?,?,?,?,?,?,?)`,
        args: [id, 'whatsapp', 'pending', String(to), String(message), scheduledAt, eventId ?? null, now],
      });

      if (!scheduleAt) {
        try {
          await sendWhatsApp(String(to), String(message));
          await db.execute({ sql: `UPDATE message_logs SET status = 'sent', sent_at = ? WHERE id = ?`, args: [new Date().toISOString(), id] });
        } catch (sendErr) {
          const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
          await db.execute({ sql: `UPDATE message_logs SET status = 'failed', error = ? WHERE id = ?`, args: [errMsg, id] });
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

  // ── POST /api/messages/email ───────────────────────────────────────────────
  if (route === 'email') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (req.query.test === 'true') {
      try {
        const { to } = req.body ?? {};
        if (!to) return res.status(400).json({ error: "Missing 'to' field" });
        await sendEmail([String(to)], 'Test from Calendar App', 'This is a test email from your Calendar App ✅');
        return res.status(200).json({ ok: true });
      } catch (err) {
        return res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
      }
    }

    try {
      const db = await ensureInit();
      const { to, subject, body, scheduleAt, eventId } = req.body ?? {};
      if (!to || !Array.isArray(to) || to.length === 0 || !subject || !body)
        return res.status(400).json({ error: 'to (array), subject, and body are required' });

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if ((to as string[]).some(addr => !emailRegex.test(addr)))
        return res.status(400).json({ error: 'One or more email addresses are invalid' });

      const id = randomUUID();
      const now = new Date().toISOString();
      const scheduledAt = scheduleAt ?? now;
      const recipient = (to as string[]).join(', ');

      await db.execute({
        sql: `INSERT INTO message_logs (id, type, status, recipient, subject, message, scheduled_at, event_id, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
        args: [id, 'email', 'pending', recipient, String(subject), String(body), scheduledAt, eventId ?? null, now],
      });

      if (!scheduleAt) {
        try {
          await sendEmail(to as string[], String(subject), String(body));
          await db.execute({ sql: `UPDATE message_logs SET status = 'sent', sent_at = ? WHERE id = ?`, args: [new Date().toISOString(), id] });
        } catch (sendErr) {
          const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
          await db.execute({ sql: `UPDATE message_logs SET status = 'failed', error = ? WHERE id = ?`, args: [errMsg, id] });
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

  // ── GET|POST /api/messages/cron ────────────────────────────────────────────
  if (route === 'cron') {
    if (req.method !== 'GET' && req.method !== 'POST')
      return res.status(405).json({ error: 'Method not allowed' });

    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const auth = req.headers['authorization'];
      if (auth !== `Bearer ${cronSecret}`)
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const db = await ensureInit();
      const now = new Date().toISOString();
      const result = await db.execute({
        sql: `SELECT * FROM message_logs WHERE status = 'pending' AND scheduled_at <= ? ORDER BY scheduled_at ASC`,
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
            await sendEmail(log.recipient.split(',').map(s => s.trim()), log.subject ?? '(no subject)', log.message);
          }
          await db.execute({ sql: `UPDATE message_logs SET status = 'sent', sent_at = ? WHERE id = ?`, args: [new Date().toISOString(), log.id] });
          results.push({ id: log.id, status: 'sent' });
        } catch (sendErr) {
          const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
          await db.execute({ sql: `UPDATE message_logs SET status = 'failed', error = ? WHERE id = ?`, args: [errMsg, log.id] });
          results.push({ id: log.id, status: 'failed', error: errMsg });
        }
      }

      return res.status(200).json({ processed: pending.length, results });
    } catch (err) {
      console.error('[/api/messages/cron]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(404).json({ error: 'Unknown messages route' });
}

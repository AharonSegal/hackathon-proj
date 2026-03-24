/**
 * api/[...path].ts
 * -----------------
 * Top-level catch-all for all unmatched /api/* routes.
 * More specific routes (api/events/, api/notes/, api/worklog/, etc.)
 * take Vercel routing priority and are NOT intercepted here.
 *
 * Routes handled:
 *   GET  /api/ping     — instant liveness probe (no DB)
 *   GET  /api/health   — full health check with DB latency
 *   GET  /api/debug    — diagnostic: env vars (masked) + DB status
 *   POST /api/settings — settings stub (settings live in frontend localStorage)
 *   *    /api/*        — 404 for anything else
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const parts = Array.isArray(req.query.path) ? req.query.path : [req.query.path ?? ''];
  const route = parts.join('/');

  // ── GET /api/ or /api (root) — treat same as ping ─────────────────────────
  if (route === '' && req.method === 'GET') {
    return res.status(200).json({ pong: true });
  }

  // ── GET /api/ping — instant liveness ──────────────────────────────────────
  if (route === 'ping' && req.method === 'GET') {
    return res.status(200).json({ pong: true });
  }

  // ── GET /api/health — DB health check ─────────────────────────────────────
  if (route === 'health' && req.method === 'GET') {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) {
      return res.status(200).json({ status: 'degraded', db: 'TURSO_DATABASE_URL not set' });
    }
    try {
      const start = Date.now();
      const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
      await db.execute('SELECT 1');
      return res.status(200).json({ status: 'ok', db: 'ok', latencyMs: Date.now() - start });
    } catch (err) {
      return res.status(200).json({ status: 'degraded', db: String(err) });
    }
  }

  // ── GET /api/debug — diagnostic ───────────────────────────────────────────
  if (route === 'debug' && req.method === 'GET') {
    const mask = (v: string | undefined) =>
      v ? v.slice(0, 8) + '…[masked]' : '(not set)';

    const env = {
      TURSO_DATABASE_URL: mask(process.env.TURSO_DATABASE_URL),
      TURSO_AUTH_TOKEN:   mask(process.env.TURSO_AUTH_TOKEN),
      SMTP_HOST:          process.env.SMTP_HOST ?? '(not set)',
      SMTP_PORT:          process.env.SMTP_PORT ?? '(not set)',
      SMTP_USER:          mask(process.env.SMTP_USER),
      EMAIL_FROM_NAME:    process.env.EMAIL_FROM_NAME ?? '(not set)',
      WHATSAPP_PHONE_NUMBER_ID: mask(process.env.WHATSAPP_PHONE_NUMBER_ID),
      WHATSAPP_ACCESS_TOKEN:    mask(process.env.WHATSAPP_ACCESS_TOKEN),
      CRON_SECRET: mask(process.env.CRON_SECRET),
    };

    let db: Record<string, unknown> = { status: 'not tested' };
    const url = process.env.TURSO_DATABASE_URL;
    if (url) {
      try {
        const start = Date.now();
        const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
        const r = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
        db = {
          status: 'ok',
          latencyMs: Date.now() - start,
          tables: r.rows.map(row => row.name),
        };
      } catch (err) {
        db = { status: 'error', error: String(err) };
      }
    }

    return res.status(200).json({ env, db });
  }

  // ── POST /api/settings — settings stub ────────────────────────────────────
  if (route === 'settings') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    // Settings are persisted in localStorage on the frontend.
    return res.status(200).json({ ok: true });
  }

  // ── Fallthrough — 404 ─────────────────────────────────────────────────────
  return res.status(404).json({ error: `No API route: /api/${route}` });
}

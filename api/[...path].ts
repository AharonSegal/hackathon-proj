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
 *
 * Vercel dev fallbacks (zero-segment and two-segment paths that don't reach
 * their subdirectory catch-all handler in local dev):
 *   GET  /api/trash           — list all trashed notes + events
 *   DELETE /api/trash         — empty trash (permanent delete of all)
 *   GET    /api/worklog/entries/:id — fetch one worklog entry
 *   PUT    /api/worklog/entries/:id — update one worklog entry
 *   DELETE /api/worklog/entries/:id — delete one worklog entry
 *
 *   *    /api/*        — 404 for anything else
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';
import { ensureInit, rowToTrashNote, rowToTrashEvent, rowToTrashWorklogEntry, rowToWorklogEntry } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const parts = Array.isArray(req.query.path) ? req.query.path : [req.query.path ?? ''];
  let route = parts.filter(Boolean).join('/');

  // URL fallback: when req.query.path is absent or empty, derive route from the
  // raw URL. This handles Vercel dev quirks where the catch-all query param
  // is not populated for zero-segment base paths like /api/trash.
  if (!route) {
    const m = (req.url ?? '').match(/\/api\/([^?]*)/);
    if (m && m[1]) route = m[1].replace(/\/$/, '');
  }

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

  // ── /api/trash (collection) ───────────────────────────────────────────────
  // Handles GET + DELETE on the base /api/trash URL. In Vercel's file-based
  // routing the zero-segment base URL is not matched by the subdirectory
  // catch-all (api/trash/[...path].ts), so it falls through to here.
  if (route === 'trash') {
    try {
      const db = await ensureInit();

      if (req.method === 'GET') {
        const notesResult = await db.execute(`
          SELECT t.id as trash_id, n.id, n.title, n.folder_id, t.deleted_at
          FROM trash t
          JOIN notes n ON n.id = t.entity_id
          WHERE t.entity_type = 'note'
          ORDER BY t.deleted_at DESC
        `);
        const eventsResult = await db.execute(`
          SELECT t.id as trash_id, e.id, e.title, e.date, e.folder_id, t.deleted_at
          FROM trash t
          JOIN events e ON e.id = t.entity_id
          WHERE t.entity_type = 'event'
          ORDER BY t.deleted_at DESC
        `);
        const worklogsResult = await db.execute(`
          SELECT t.id as trash_id, w.id, w.title, w.date, w.project, t.deleted_at
          FROM trash t
          JOIN worklog_entries w ON w.id = t.entity_id
          WHERE t.entity_type = 'worklog_entry'
          ORDER BY t.deleted_at DESC
        `);
        return res.status(200).json({
          notes:    notesResult.rows.map(r => rowToTrashNote(r as Record<string, unknown>)),
          events:   eventsResult.rows.map(r => rowToTrashEvent(r as Record<string, unknown>)),
          worklogs: worklogsResult.rows.map(r => rowToTrashWorklogEntry(r as Record<string, unknown>)),
        });
      }

      if (req.method === 'DELETE') {
        await db.execute(`DELETE FROM notes  WHERE id IN (SELECT entity_id FROM trash WHERE entity_type = 'note')`);
        await db.execute(`DELETE FROM events WHERE id IN (SELECT entity_id FROM trash WHERE entity_type = 'event')`);
        await db.execute(`DELETE FROM worklog_entries WHERE id IN (SELECT entity_id FROM trash WHERE entity_type = 'worklog_entry')`);
        await db.execute('DELETE FROM trash');
        return res.status(204).end();
      }

      return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
      console.error('[/api/trash fallback]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ── /api/worklog/entries/:id — vercel dev two-segment fallback ────────────
  // In vercel dev, two-segment paths under api/worklog/[...path].ts may not
  // be routed correctly and fall through to this top-level catch-all.
  const wlMatch = route.match(/^worklog\/entries\/([^/]+)$/);
  if (wlMatch) {
    const wlId = wlMatch[1];
    try {
      const db = await ensureInit();

      if (req.method === 'GET') {
        const result = await db.execute({ sql: 'SELECT * FROM worklog_entries WHERE id = ?', args: [wlId] });
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(rowToWorklogEntry(result.rows[0] as Record<string, unknown>));
      }

      if (req.method === 'PUT') {
        const b = req.body ?? {};
        if (!b.title) return res.status(400).json({ error: 'title is required' });
        const cur = await db.execute({ sql: 'SELECT * FROM worklog_entries WHERE id = ?', args: [wlId] });
        if (cur.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        const c = cur.rows[0] as Record<string, unknown>;
        await db.execute({
          sql: `UPDATE worklog_entries SET
                date = ?, day_number = ?, project = ?, categories = ?, title = ?,
                description = ?, technologies = ?, team_type = ?, team_size = ?,
                coding_languages = ?
                WHERE id = ?`,
          args: [
            b.date ?? c.date,
            b.dayNumber ?? c.day_number ?? 1,
            b.project ?? c.project ?? '',
            JSON.stringify(b.categories ?? []),
            String(b.title),
            b.description ?? null,
            JSON.stringify(b.technologies ?? []),
            b.teamType ?? c.team_type ?? 'solo',
            b.teamSize ?? null,
            JSON.stringify(b.codingLanguages ?? []),
            wlId,
          ],
        });
        const row = await db.execute({ sql: 'SELECT * FROM worklog_entries WHERE id = ?', args: [wlId] });
        if (row.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(rowToWorklogEntry(row.rows[0] as Record<string, unknown>));
      }

      if (req.method === 'DELETE') {
        const now = new Date().toISOString();
        await db.execute({ sql: 'UPDATE worklog_entries SET deleted_at = ? WHERE id = ?', args: [now, wlId] });
        const { randomUUID } = await import('node:crypto');
        await db.execute({
          sql: 'INSERT INTO trash (id, entity_id, entity_type, deleted_at) VALUES (?, ?, ?, ?)',
          args: [randomUUID(), wlId, 'worklog_entry', now],
        });
        return res.status(204).end();
      }

      return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
      console.error('[/api/worklog/entries/:id fallback]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ── Fallthrough — 404 ─────────────────────────────────────────────────────
  return res.status(404).json({ error: `No API route: /api/${route}` });
}

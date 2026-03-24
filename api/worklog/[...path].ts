/**
 * api/worklog/[...path].ts
 * --------------------------
 * Single Vercel serverless function handling ALL /api/worklog/* routes.
 * Consolidated from 5 separate files to stay within Vercel Hobby plan's
 * 12-function limit.
 *
 * Routes:
 * GET    /api/worklog/entries            — list all entries (date DESC)
 * POST   /api/worklog/entries            — create entry; body must include title
 * DELETE /api/worklog/entries            — clear all entries (danger)
 * GET    /api/worklog/entries/:id        — fetch one entry; 404 if missing
 * PUT    /api/worklog/entries/:id        — full-replace update
 * DELETE /api/worklog/entries/:id        — delete single entry
 * GET    /api/worklog/schema             — get schema JSON (or null)
 * PUT    /api/worklog/schema             — upsert schema document
 * GET    /api/worklog/preferences        — get preferences JSON (or null)
 * PUT    /api/worklog/preferences        — upsert preferences document
 * GET    /api/worklog/export?format=csv  — download all entries as CSV
 * GET    /api/worklog/export?format=json — download schema as JSON
 *
 * Routing: req.query.path is string[] from Vercel catch-all routing.
 *   path[0] = resource  ('entries' | 'schema' | 'preferences' | 'export')
 *   path[1] = entry id  (only present for /entries/:id)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { ensureInit, rowToWorklogEntry } from '../../lib/db';

// ── CSV helper ────────────────────────────────────────────────────────────────

function entriesToCSV(entries: ReturnType<typeof rowToWorklogEntry>[]): string {
  const headers = ['date','dayNumber','project','categories','codingLanguages','title','description','technologies','teamType','teamSize','createdAt'];
  const escape = (val: unknown) => {
    const str = String(val ?? '');
    return (str.includes(',') || str.includes('"') || str.includes('\n'))
      ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const rows = entries.map((e) => [
    e.date, e.dayNumber, e.project,
    (e.categories || []).join('; '),
    (e.codingLanguages || []).join('; '),
    e.title, e.description || '',
    (e.technologies as { tech: string; subTechs: string[] }[])
      .map((t) => `${t.tech}${t.subTechs?.length ? ` (${t.subTechs.join(', ')})` : ''}`).join(' | '),
    e.teamType, e.teamSize ?? '', e.createdAt,
  ]);
  return [headers.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Parse route segments — req.query.path may be absent in some vercel dev versions;
  // fall back to parsing req.url (/api/worklog/<resource>[/<id>]) directly.
  let resource = '';
  let id: string | undefined;

  const qp = req.query.path;
  if (Array.isArray(qp) && qp.length > 0 && qp[0]) {
    [resource, id] = qp as [string, string | undefined];
  } else if (typeof qp === 'string' && qp) {
    resource = qp;
  } else {
    const m = (req.url ?? '').match(/\/api\/worklog\/([^/?]+)(?:\/([^/?]+))?/);
    if (m && m[1]) { resource = m[1]; id = m[2]; }
  }

  try {
    const db = await ensureInit();

    // ── /api/worklog/entries (collection) ─────────────────────────────────────
    if (resource === 'entries' && !id) {
      if (req.method === 'GET') {
        const result = await db.execute(
          'SELECT * FROM worklog_entries ORDER BY date DESC, created_at DESC',
        );
        return res.status(200).json(
          result.rows.map(r => rowToWorklogEntry(r as Record<string, unknown>)),
        );
      }

      if (req.method === 'POST') {
        const b = req.body ?? {};
        if (!b.title) return res.status(400).json({ error: 'title is required' });
        const entryId = String(b.id ?? randomUUID());
        const now = new Date().toISOString();
        await db.execute({
          sql: `INSERT INTO worklog_entries
                (id, date, day_number, project, categories, title, description,
                 technologies, team_type, team_size, coding_languages, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            entryId,
            b.date ?? now.split('T')[0],
            b.dayNumber ?? 1,
            b.project ?? '',
            JSON.stringify(b.categories ?? []),
            String(b.title),
            b.description ?? null,
            JSON.stringify(b.technologies ?? []),
            b.teamType ?? 'solo',
            b.teamSize ?? null,
            JSON.stringify(b.codingLanguages ?? []),
            b.createdAt ?? now,
          ],
        });
        const row = await db.execute({
          sql: 'SELECT * FROM worklog_entries WHERE id = ?',
          args: [entryId],
        });
        return res.status(201).json(rowToWorklogEntry(row.rows[0] as Record<string, unknown>));
      }

      if (req.method === 'DELETE') {
        await db.execute('DELETE FROM worklog_entries');
        return res.status(204).end();
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── /api/worklog/entries/:id ──────────────────────────────────────────────
    if (resource === 'entries' && id) {
      if (req.method === 'GET') {
        const result = await db.execute({
          sql: 'SELECT * FROM worklog_entries WHERE id = ?',
          args: [id],
        });
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(rowToWorklogEntry(result.rows[0] as Record<string, unknown>));
      }

      if (req.method === 'PUT') {
        const b = req.body ?? {};
        if (!b.title) return res.status(400).json({ error: 'title is required' });
        await db.execute({
          sql: `UPDATE worklog_entries SET
                date = ?, day_number = ?, project = ?, categories = ?, title = ?,
                description = ?, technologies = ?, team_type = ?, team_size = ?,
                coding_languages = ?
                WHERE id = ?`,
          args: [
            b.date,
            b.dayNumber ?? 1,
            b.project ?? '',
            JSON.stringify(b.categories ?? []),
            String(b.title),
            b.description ?? null,
            JSON.stringify(b.technologies ?? []),
            b.teamType ?? 'solo',
            b.teamSize ?? null,
            JSON.stringify(b.codingLanguages ?? []),
            id,
          ],
        });
        const row = await db.execute({
          sql: 'SELECT * FROM worklog_entries WHERE id = ?',
          args: [id],
        });
        if (row.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(rowToWorklogEntry(row.rows[0] as Record<string, unknown>));
      }

      if (req.method === 'DELETE') {
        await db.execute({ sql: 'DELETE FROM worklog_entries WHERE id = ?', args: [id] });
        return res.status(204).end();
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── /api/worklog/schema ───────────────────────────────────────────────────
    if (resource === 'schema') {
      if (req.method === 'GET') {
        const result = await db.execute({
          sql: 'SELECT data FROM worklog_schema WHERE id = ?',
          args: ['default'],
        });
        if (result.rows.length === 0) return res.status(200).json(null);
        try {
          return res.status(200).json(
            JSON.parse((result.rows[0] as Record<string, unknown>).data as string),
          );
        } catch {
          return res.status(200).json(null);
        }
      }

      if (req.method === 'PUT') {
        await db.execute({
          sql: 'INSERT INTO worklog_schema (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
          args: ['default', JSON.stringify(req.body ?? {})],
        });
        return res.status(200).json(req.body ?? {});
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── /api/worklog/preferences ──────────────────────────────────────────────
    if (resource === 'preferences') {
      if (req.method === 'GET') {
        const result = await db.execute({
          sql: 'SELECT data FROM worklog_preferences WHERE id = ?',
          args: ['default'],
        });
        if (result.rows.length === 0) return res.status(200).json(null);
        try {
          return res.status(200).json(
            JSON.parse((result.rows[0] as Record<string, unknown>).data as string),
          );
        } catch {
          return res.status(200).json(null);
        }
      }

      if (req.method === 'PUT') {
        await db.execute({
          sql: 'INSERT INTO worklog_preferences (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
          args: ['default', JSON.stringify(req.body ?? null)],
        });
        return res.status(200).json(req.body ?? null);
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── /api/worklog/export ───────────────────────────────────────────────────
    if (resource === 'export') {
      if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
      const format = (req.query.format as string) ?? 'csv';
      const date = new Date().toISOString().split('T')[0];

      if (format === 'json') {
        const schemaRow = await db.execute({
          sql: 'SELECT data FROM worklog_schema WHERE id = ?',
          args: ['default'],
        });
        const schema = schemaRow.rows.length > 0
          ? (schemaRow.rows[0] as Record<string, unknown>).data
          : '{}';
        res.setHeader('Content-Disposition', `attachment; filename="worklog_schema_${date}.json"`);
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).send(schema);
      }

      const result = await db.execute(
        'SELECT * FROM worklog_entries ORDER BY date ASC',
      );
      const csv = entriesToCSV(
        result.rows.map(r => rowToWorklogEntry(r as Record<string, unknown>)),
      );
      res.setHeader('Content-Disposition', `attachment; filename="worklog_export_${date}.csv"`);
      res.setHeader('Content-Type', 'text/csv');
      return res.status(200).send(csv);
    }

    return res.status(404).json({ error: 'Not found' });

  } catch (err) {
    console.error('[/api/worklog/[...path]]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * api/worklog/export.ts
 * -----------------------
 * Vercel serverless handler for server-side worklog data exports.
 * Used as a fallback; the frontend also provides client-side exports
 * via exportService.ts without needing this endpoint.
 *
 * Endpoints:
 * GET /api/worklog/export?format=csv  — streams all worklog_entries as a
 *                                       CSV file (Content-Disposition: attachment)
 * GET /api/worklog/export?format=json — streams the worklog_schema document
 *                                       as a downloadable JSON file
 *
 * CSV columns: id, date, dayNumber, project, categories, title, description,
 *              technologies, teamType, teamSize, codingLanguages, createdAt
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureInit, rowToWorklogEntry } from '../../lib/db';

function entriesToCSV(entries: ReturnType<typeof rowToWorklogEntry>[]): string {
  const headers = ['date','dayNumber','project','categories','codingLanguages','title','description','technologies','teamType','teamSize','createdAt'];
  const escape = (val: unknown) => {
    const str = String(val ?? '');
    return (str.includes(',') || str.includes('"') || str.includes('\n')) ? `"${str.replace(/"/g, '""')}"` : str;
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const db = await ensureInit();
    const format = (req.query.format as string) ?? 'csv';
    const date = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      const schemaRow = await db.execute({ sql: 'SELECT data FROM worklog_schema WHERE id = ?', args: ['default'] });
      const schema = schemaRow.rows.length > 0 ? (schemaRow.rows[0] as Record<string, unknown>).data : '{}';
      res.setHeader('Content-Disposition', `attachment; filename="worklog_schema_${date}.json"`);
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(schema);
    }

    // Default: CSV
    const result = await db.execute('SELECT * FROM worklog_entries ORDER BY date ASC');
    const entries = result.rows.map(r => rowToWorklogEntry(r as Record<string, unknown>));
    const csv = entriesToCSV(entries);
    res.setHeader('Content-Disposition', `attachment; filename="worklog_export_${date}.csv"`);
    res.setHeader('Content-Type', 'text/csv');
    return res.status(200).send(csv);
  } catch (err) {
    console.error('[/api/worklog/export]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

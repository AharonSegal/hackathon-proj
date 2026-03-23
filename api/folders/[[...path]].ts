/**
 * api/folders/[[...path]].ts
 * ---------------------------
 * Catch-all handler for all folders endpoints (Hobby plan: ≤12 functions).
 *
 * GET    /api/folders      — list all folders
 * POST   /api/folders      — create folder
 * PUT    /api/folders/:id  — update name / color
 * DELETE /api/folders/:id  — delete folder (moves notes to no-folder)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { ensureInit, rowToFolder } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await ensureInit();

    const segments = Array.isArray(req.query.path)
      ? req.query.path
      : req.query.path ? [req.query.path] : [];
    const id = segments[0] as string | undefined;

    // ── /api/folders (no id) ──────────────────────────────────────────────────
    if (!id) {
      if (req.method === 'GET') {
        const result = await db.execute('SELECT * FROM folders ORDER BY created_at ASC');
        return res.status(200).json(result.rows.map(r => rowToFolder(r as Record<string, unknown>)));
      }

      if (req.method === 'POST') {
        const { id: bodyId = randomUUID(), name = 'New Folder', color = 'slate' } = req.body ?? {};
        const now = new Date().toISOString();
        await db.execute({
          sql: 'INSERT OR REPLACE INTO folders (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
          args: [String(bodyId), String(name), String(color), now, now],
        });
        const row = await db.execute({ sql: 'SELECT * FROM folders WHERE id = ?', args: [String(bodyId)] });
        if (row.rows.length === 0) return res.status(500).json({ error: 'Failed to create folder' });
        return res.status(201).json(rowToFolder(row.rows[0] as Record<string, unknown>));
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── /api/folders/:id ──────────────────────────────────────────────────────
    if (req.method === 'PUT') {
      const existing = await db.execute({ sql: 'SELECT * FROM folders WHERE id = ?', args: [id] });
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Folder not found' });
      const cur = existing.rows[0] as Record<string, unknown>;
      const b   = req.body ?? {};
      const name  = 'name'  in b ? String(b.name)  : String(cur.name);
      const color = 'color' in b ? String(b.color) : String(cur.color);
      const now = new Date().toISOString();
      await db.execute({
        sql: 'UPDATE folders SET name = ?, color = ?, updated_at = ? WHERE id = ?',
        args: [name, color, now, id],
      });
      const updated = await db.execute({ sql: 'SELECT * FROM folders WHERE id = ?', args: [id] });
      return res.status(200).json(rowToFolder(updated.rows[0] as Record<string, unknown>));
    }

    if (req.method === 'DELETE') {
      await db.execute({ sql: 'UPDATE notes SET folder_id = NULL WHERE folder_id = ?', args: [id] });
      await db.execute({ sql: 'DELETE FROM folders WHERE id = ?', args: [id] });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[/api/folders]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * api/notes/[id].ts — PUT + DELETE /api/notes/:id
 * -------------------------------------------------
 * Update or delete a specific note.
 *
 * PUT    /api/notes/:id — partial update (title, content, pinned, tags)
 * DELETE /api/notes/:id — deletes the note, returns HTTP 204
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureInit, rowToNote } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await ensureInit();
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing note id' });
    }

    const existing = await db.execute({ sql: 'SELECT * FROM notes WHERE id = ?', args: [id] });
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // ── PUT /api/notes/:id ───────────────────────────────────────────────────
    if (req.method === 'PUT') {
      const cur = existing.rows[0] as Record<string, unknown>;
      const b   = req.body ?? {};

      const title    = 'title'    in b ? String(b.title)   : String(cur.title);
      const content  = 'content'  in b ? String(b.content) : String(cur.content);
      const pinned   = 'pinned'   in b ? (b.pinned ? 1 : 0) : Number(cur.pinned);
      const tags     = 'tags'     in b
        ? JSON.stringify(Array.isArray(b.tags) ? b.tags : [])
        : String(cur.tags ?? '[]');
      const folderId = 'folderId' in b ? (b.folderId === null ? null : String(b.folderId)) : (cur.folder_id ?? null);
      const now = new Date().toISOString();

      await db.execute({
        sql: `UPDATE notes SET title = ?, content = ?, pinned = ?, tags = ?, folder_id = ?, updated_at = ? WHERE id = ?`,
        args: [title, content, pinned, tags, folderId, now, id],
      });

      const updated = await db.execute({ sql: 'SELECT * FROM notes WHERE id = ?', args: [id] });
      return res.status(200).json(rowToNote(updated.rows[0] as Record<string, unknown>));
    }

    // ── DELETE /api/notes/:id ────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      await db.execute({ sql: 'DELETE FROM notes WHERE id = ?', args: [id] });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[PUT|DELETE /api/notes/[id]]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

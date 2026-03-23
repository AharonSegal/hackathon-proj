/**
 * api/todos/[id].ts — PUT + DELETE /api/todos/:id
 * ------------------------------------------------
 * PUT    /api/todos/:id — partial update (title, completed)
 * DELETE /api/todos/:id — hard delete a todo
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureInit, rowToTodo } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await ensureInit();
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing todo id' });
    }

    const existing = await db.execute({ sql: 'SELECT * FROM todos WHERE id = ?', args: [id] });
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    // ── PUT /api/todos/:id ────────────────────────────────────────────────────
    if (req.method === 'PUT') {
      const cur = existing.rows[0] as Record<string, unknown>;
      const b   = req.body ?? {};
      const now = new Date().toISOString();

      const title     = 'title'     in b ? String(b.title)       : String(cur.title);
      const completed = 'completed' in b ? (b.completed ? 1 : 0) : Number(cur.completed);
      const completedAt = completed
        ? ('completedAt' in b ? (b.completedAt ?? now) : (cur.completed_at ?? now))
        : null;

      await db.execute({
        sql: 'UPDATE todos SET title = ?, completed = ?, completed_at = ?, updated_at = ? WHERE id = ?',
        args: [title, completed, completedAt, now, id],
      });

      const updated = await db.execute({ sql: 'SELECT * FROM todos WHERE id = ?', args: [id] });
      return res.status(200).json(rowToTodo(updated.rows[0] as Record<string, unknown>));
    }

    // ── DELETE /api/todos/:id ─────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      await db.execute({ sql: 'DELETE FROM todos WHERE id = ?', args: [id] });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[PUT|DELETE /api/todos/[id]]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

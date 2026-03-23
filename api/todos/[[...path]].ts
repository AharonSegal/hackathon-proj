/**
 * api/todos/[[...path]].ts
 * -------------------------
 * Catch-all handler for all todos endpoints (Hobby plan: ≤12 functions).
 *
 * GET    /api/todos      — list all todos (created_at DESC)
 * POST   /api/todos      — create a new todo
 * PUT    /api/todos/:id  — partial update (title, completed)
 * DELETE /api/todos/:id  — hard delete
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { ensureInit, rowToTodo } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await ensureInit();

    const segments = Array.isArray(req.query.path)
      ? req.query.path
      : req.query.path ? [req.query.path] : [];
    const id = segments[0] as string | undefined;

    // ── /api/todos (no id) ────────────────────────────────────────────────────
    if (!id) {
      if (req.method === 'GET') {
        const result = await db.execute('SELECT * FROM todos ORDER BY created_at DESC');
        return res.status(200).json(result.rows.map(r => rowToTodo(r as Record<string, unknown>)));
      }

      if (req.method === 'POST') {
        const { id: bodyId = randomUUID(), title } = req.body ?? {};
        if (!title) return res.status(400).json({ error: 'title is required' });
        const now = new Date().toISOString();
        await db.execute({
          sql: 'INSERT INTO todos (id, title, completed, created_at, updated_at) VALUES (?, ?, 0, ?, ?)',
          args: [String(bodyId), String(title), now, now],
        });
        const row = await db.execute({ sql: 'SELECT * FROM todos WHERE id = ?', args: [String(bodyId)] });
        if (row.rows.length === 0) return res.status(500).json({ error: 'Failed to create todo' });
        return res.status(201).json(rowToTodo(row.rows[0] as Record<string, unknown>));
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── /api/todos/:id ────────────────────────────────────────────────────────
    const existing = await db.execute({ sql: 'SELECT * FROM todos WHERE id = ?', args: [id] });
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Todo not found' });

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

    if (req.method === 'DELETE') {
      await db.execute({ sql: 'DELETE FROM todos WHERE id = ?', args: [id] });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[/api/todos]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

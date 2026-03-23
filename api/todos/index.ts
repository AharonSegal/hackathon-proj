/**
 * api/todos/index.ts — GET + POST /api/todos
 * -------------------------------------------
 * GET  /api/todos — returns all todos ordered by created_at DESC
 * POST /api/todos — creates a new todo
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { ensureInit, rowToTodo } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await ensureInit();

    // ── GET /api/todos ────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const result = await db.execute(
        'SELECT * FROM todos ORDER BY created_at DESC',
      );
      return res.status(200).json(
        result.rows.map(r => rowToTodo(r as Record<string, unknown>)),
      );
    }

    // ── POST /api/todos ───────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const { id = randomUUID(), title } = req.body ?? {};

      if (!title) {
        return res.status(400).json({ error: 'title is required' });
      }

      const now = new Date().toISOString();
      await db.execute({
        sql: `INSERT INTO todos (id, title, completed, created_at, updated_at)
              VALUES (?, ?, 0, ?, ?)`,
        args: [String(id), String(title), now, now],
      });

      const row = await db.execute({ sql: 'SELECT * FROM todos WHERE id = ?', args: [String(id)] });
      if (row.rows.length === 0) return res.status(500).json({ error: 'Failed to create todo' });
      return res.status(201).json(rowToTodo(row.rows[0] as Record<string, unknown>));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[GET|POST /api/todos]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

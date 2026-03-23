/**
 * api/todos/index.ts
 * -------------------
 * GET  /api/todos — list all todos (created_at DESC)
 * POST /api/todos — create a new todo
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { ensureInit, rowToTodo } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await ensureInit();

    if (req.method === 'GET') {
      const result = await db.execute('SELECT * FROM todos ORDER BY created_at DESC');
      return res.status(200).json(result.rows.map(r => rowToTodo(r as Record<string, unknown>)));
    }

    if (req.method === 'POST') {
      const b = req.body ?? {};
      const id = String(b.id ?? randomUUID());
      const title = b.title;
      if (!title) return res.status(400).json({ error: 'title is required' });
      const now = new Date().toISOString();

      const reminderConfig = b.reminderConfig != null
        ? JSON.stringify(b.reminderConfig)
        : null;

      await db.execute({
        sql: `INSERT INTO todos (
          id, title, description, completed, completed_at,
          due_date, due_time, deadline, priority, location,
          reminder_config, recurrence, recurrence_end, project,
          created_at, updated_at
        ) VALUES (?, ?, ?, 0, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          String(title),
          b.description ?? null,
          b.dueDate ?? null,
          b.dueTime ?? null,
          b.deadline ?? null,
          b.priority ?? 4,
          b.location ?? null,
          reminderConfig,
          b.recurrence ?? 'none',
          b.recurrenceEnd ?? null,
          b.project ?? 'Inbox',
          now,
          now,
        ],
      });

      const row = await db.execute({ sql: 'SELECT * FROM todos WHERE id = ?', args: [id] });
      if (row.rows.length === 0) return res.status(500).json({ error: 'Failed to create todo' });
      return res.status(201).json(rowToTodo(row.rows[0] as Record<string, unknown>));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[/api/todos]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

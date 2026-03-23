/**
 * api/todos/[id].ts
 * ------------------
 * PUT    /api/todos/:id — partial update
 * DELETE /api/todos/:id — hard delete
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureInit, rowToTodo } from '../../lib/db';

const FIELD_MAP: Record<string, string> = {
  title:         'title',
  description:   'description',
  completed:     'completed',
  completedAt:   'completed_at',
  dueDate:       'due_date',
  dueTime:       'due_time',
  deadline:      'deadline',
  priority:      'priority',
  location:      'location',
  reminderConfig:'reminder_config',
  recurrence:    'recurrence',
  recurrenceEnd: 'recurrence_end',
  project:       'project',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await ensureInit();
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing todo id' });
    }

    const existing = await db.execute({ sql: 'SELECT * FROM todos WHERE id = ?', args: [id] });
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Todo not found' });

    if (req.method === 'PUT') {
      const b = req.body ?? {};
      const now = new Date().toISOString();

      const setClauses: string[] = [];
      const args: unknown[] = [];

      for (const [jsKey, dbCol] of Object.entries(FIELD_MAP)) {
        if (!(jsKey in b)) continue;
        let val = b[jsKey];
        if (jsKey === 'completed') val = val ? 1 : 0;
        if (jsKey === 'reminderConfig' && val !== null && typeof val === 'object') {
          val = JSON.stringify(val);
        }
        setClauses.push(`${dbCol} = ?`);
        args.push(val);
      }

      if (setClauses.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      setClauses.push('updated_at = ?');
      args.push(now, id);

      await db.execute({
        sql: `UPDATE todos SET ${setClauses.join(', ')} WHERE id = ?`,
        args,
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
    console.error('[/api/todos/[id]]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

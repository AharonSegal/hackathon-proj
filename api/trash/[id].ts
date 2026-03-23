/**
 * api/trash/[id].ts
 * ------------------
 * PUT    /api/trash/:id — restore item (clears deleted_at, removes from trash)
 * DELETE /api/trash/:id — permanently delete single item
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureInit } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await ensureInit();
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing trash id' });
    }

    const trashRow = await db.execute({ sql: 'SELECT * FROM trash WHERE id = ?', args: [id] });
    if (trashRow.rows.length === 0) {
      return res.status(404).json({ error: 'Trash item not found' });
    }

    const item       = trashRow.rows[0] as Record<string, unknown>;
    const entityId   = item.entity_id   as string;
    const entityType = item.entity_type as string;
    const table      = entityType === 'note' ? 'notes' : 'events';

    if (req.method === 'PUT') {
      await db.execute({ sql: `UPDATE ${table} SET deleted_at = NULL WHERE id = ?`, args: [entityId] });
      await db.execute({ sql: 'DELETE FROM trash WHERE id = ?', args: [id] });
      return res.status(204).end();
    }

    if (req.method === 'DELETE') {
      await db.execute({ sql: `DELETE FROM ${table} WHERE id = ?`, args: [entityId] });
      await db.execute({ sql: 'DELETE FROM trash WHERE id = ?', args: [id] });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[/api/trash/[id]]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * api/trash/[...path].ts
 * -----------------------
 * Consolidated trash handler (merged from index.ts + [id].ts) to stay
 * within Vercel Hobby plan's 12-function limit.
 *
 * GET    /api/trash        — list all trashed notes and events
 * DELETE /api/trash        — empty trash (permanent delete of all)
 * PUT    /api/trash/:id    — restore item (clears deleted_at, removes from trash)
 * DELETE /api/trash/:id    — permanently delete single item
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureInit, rowToTrashNote, rowToTrashEvent } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Parse id — req.query.path may be absent in some vercel dev versions;
  // fall back to parsing req.url (/api/trash[/<id>]) directly.
  let id: string | undefined;

  const qp = req.query.path;
  if (Array.isArray(qp) && qp.length > 0 && qp[0]) {
    id = qp[0] as string;
  } else if (typeof qp === 'string' && qp) {
    id = qp;
  } else {
    const m = (req.url ?? '').match(/\/api\/trash\/([^/?]+)/);
    if (m && m[1]) id = m[1];
  }

  try {
    const db = await ensureInit();

    // ── /api/trash (collection) ───────────────────────────────────────────────
    if (!id) {
      if (req.method === 'GET') {
        const notesResult = await db.execute(`
          SELECT t.id as trash_id, n.id, n.title, n.folder_id, t.deleted_at
          FROM trash t
          JOIN notes n ON n.id = t.entity_id
          WHERE t.entity_type = 'note'
          ORDER BY t.deleted_at DESC
        `);
        const eventsResult = await db.execute(`
          SELECT t.id as trash_id, e.id, e.title, e.date, e.folder_id, t.deleted_at
          FROM trash t
          JOIN events e ON e.id = t.entity_id
          WHERE t.entity_type = 'event'
          ORDER BY t.deleted_at DESC
        `);
        return res.status(200).json({
          notes:  notesResult.rows.map(r  => rowToTrashNote(r  as Record<string, unknown>)),
          events: eventsResult.rows.map(r => rowToTrashEvent(r as Record<string, unknown>)),
        });
      }

      if (req.method === 'DELETE') {
        await db.execute(`DELETE FROM notes  WHERE id IN (SELECT entity_id FROM trash WHERE entity_type = 'note')`);
        await db.execute(`DELETE FROM events WHERE id IN (SELECT entity_id FROM trash WHERE entity_type = 'event')`);
        await db.execute('DELETE FROM trash');
        return res.status(204).end();
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── /api/trash/:id ────────────────────────────────────────────────────────
    const trashRow = await db.execute({ sql: 'SELECT * FROM trash WHERE id = ?', args: [id] });
    if (trashRow.rows.length === 0) return res.status(404).json({ error: 'Trash item not found' });

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
    console.error('[/api/trash]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

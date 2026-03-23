/**
 * api/trash/index.ts — GET + DELETE /api/trash
 * ---------------------------------------------
 * GET    /api/trash — returns all trashed notes and events
 * DELETE /api/trash — empty trash (permanent delete of all trashed items)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureInit, rowToTrashNote, rowToTrashEvent } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await ensureInit();

    // ── GET /api/trash ────────────────────────────────────────────────────────
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

    // ── DELETE /api/trash — empty all ────────────────────────────────────────
    if (req.method === 'DELETE') {
      // Permanently delete all trashed notes
      await db.execute(`
        DELETE FROM notes WHERE id IN (
          SELECT entity_id FROM trash WHERE entity_type = 'note'
        )
      `);
      // Permanently delete all trashed events
      await db.execute(`
        DELETE FROM events WHERE id IN (
          SELECT entity_id FROM trash WHERE entity_type = 'event'
        )
      `);
      // Clear the trash table
      await db.execute('DELETE FROM trash');
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[GET|DELETE /api/trash]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

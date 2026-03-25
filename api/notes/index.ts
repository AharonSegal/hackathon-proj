/**
 * api/notes/index.ts — GET + POST /api/notes
 * --------------------------------------------
 * List and create notes.
 *
 * GET  /api/notes — returns all notes ordered by pinned DESC, updated_at DESC
 * POST /api/notes — creates (or restores) a note. Accepts an optional `id`
 *                   field — if provided it is used as the primary key (restore
 *                   after undo-delete). Otherwise a new UUID is generated.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { ensureInit, rowToNote } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await ensureInit();

    // ── GET /api/notes ───────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const result = await db.execute(
        'SELECT * FROM notes WHERE deleted_at IS NULL ORDER BY pinned DESC, updated_at DESC',
      );
      return res.status(200).json(
        result.rows.map(r => rowToNote(r as Record<string, unknown>)),
      );
    }

    // ── POST /api/notes ──────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const {
        id       = randomUUID(),
        title    = 'Untitled Note',
        content  = '[]',
        pinned   = false,
        tags     = [],
      } = req.body ?? {};

      const now = new Date().toISOString();

      await db.execute({
        sql: `INSERT OR REPLACE INTO notes (id, title, content, pinned, tags, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          String(id),
          String(title),
          String(content),
          pinned ? 1 : 0,
          JSON.stringify(Array.isArray(tags) ? tags : []),
          now,
          now,
        ],
      });

      const row = await db.execute({ sql: 'SELECT * FROM notes WHERE id = ?', args: [String(id)] });
      if (row.rows.length === 0) return res.status(500).json({ error: 'Failed to create note' });
      return res.status(201).json(rowToNote(row.rows[0] as Record<string, unknown>));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[GET|POST /api/notes]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { ensureInit, rowToFolder } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await ensureInit();

    if (req.method === 'GET') {
      const result = await db.execute('SELECT * FROM folders ORDER BY created_at ASC');
      return res.status(200).json(result.rows.map(r => rowToFolder(r as Record<string, unknown>)));
    }

    if (req.method === 'POST') {
      const { id = randomUUID(), name = 'New Folder', color = 'slate' } = req.body ?? {};
      const now = new Date().toISOString();
      await db.execute({
        sql: 'INSERT OR REPLACE INTO folders (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        args: [String(id), String(name), String(color), now, now],
      });
      const row = await db.execute({ sql: 'SELECT * FROM folders WHERE id = ?', args: [String(id)] });
      if (row.rows.length === 0) return res.status(500).json({ error: 'Failed to create folder' });
      return res.status(201).json(rowToFolder(row.rows[0] as Record<string, unknown>));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[GET|POST /api/folders]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

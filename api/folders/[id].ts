import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureInit, rowToFolder } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await ensureInit();
    const { id } = req.query;
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing folder id' });

    if (req.method === 'PUT') {
      const existing = await db.execute({ sql: 'SELECT * FROM folders WHERE id = ?', args: [id] });
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Folder not found' });
      const cur = existing.rows[0] as Record<string, unknown>;
      const b = req.body ?? {};
      const name  = 'name'  in b ? String(b.name)  : String(cur.name);
      const color = 'color' in b ? String(b.color) : String(cur.color);
      const now = new Date().toISOString();
      await db.execute({ sql: 'UPDATE folders SET name = ?, color = ?, updated_at = ? WHERE id = ?', args: [name, color, now, id] });
      const updated = await db.execute({ sql: 'SELECT * FROM folders WHERE id = ?', args: [id] });
      return res.status(200).json(rowToFolder(updated.rows[0] as Record<string, unknown>));
    }

    if (req.method === 'DELETE') {
      // Move notes out of this folder before deleting
      await db.execute({ sql: 'UPDATE notes SET folder_id = NULL WHERE folder_id = ?', args: [id] });
      await db.execute({ sql: 'DELETE FROM folders WHERE id = ?', args: [id] });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[PUT|DELETE /api/folders/[id]]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

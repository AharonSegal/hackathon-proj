import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Settings are persisted in localStorage on the frontend.
  // This endpoint accepts the payload for future server-side storage.
  return res.status(200).json({ ok: true });
}

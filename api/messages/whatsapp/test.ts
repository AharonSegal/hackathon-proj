import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendWhatsApp } from '../../../lib/whatsapp';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to } = req.body ?? {};
    if (!to) return res.status(400).json({ error: "Missing 'to' field" });

    await sendWhatsApp(String(to), '✅ Test message from Calendar App!');
    return res.status(200).json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(502).json({ error: msg });
  }
}

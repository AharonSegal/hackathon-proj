import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendEmail } from '../../../lib/email';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to } = req.body ?? {};
    if (!to) return res.status(400).json({ error: "Missing 'to' field" });

    await sendEmail(
      [String(to)],
      'Test from Calendar App',
      'This is a test email from your Calendar App ✅',
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(502).json({ error: msg });
  }
}

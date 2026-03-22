import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureInit } from '../lib/db';

function mask(val: string | undefined): string {
  if (!val) return '— NOT SET —';
  if (val.length <= 12) return val;
  return val.slice(0, 8) + '...' + val.slice(-4);
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const t0 = Date.now();
  const result: Record<string, unknown> = {};

  // ── 1. Environment variables ──────────────────────────────────────────────
  result.env = {
    TURSO_DATABASE_URL:        process.env.TURSO_DATABASE_URL        ?? null,
    TURSO_AUTH_TOKEN:          mask(process.env.TURSO_AUTH_TOKEN),
    WHATSAPP_PHONE_NUMBER_ID:  process.env.WHATSAPP_PHONE_NUMBER_ID  ?? null,
    WHATSAPP_ACCESS_TOKEN:     mask(process.env.WHATSAPP_ACCESS_TOKEN),
    SMTP_HOST:                 process.env.SMTP_HOST                 ?? null,
    SMTP_PORT:                 process.env.SMTP_PORT                 ?? null,
    SMTP_USER:                 process.env.SMTP_USER                 ?? null,
    SMTP_PASSWORD:             mask(process.env.SMTP_PASSWORD),
    EMAIL_FROM_NAME:           process.env.EMAIL_FROM_NAME           ?? null,
    CRON_SECRET:               mask(process.env.CRON_SECRET),
  };

  // ── 2. Turso DB connection ────────────────────────────────────────────────
  try {
    const db = await ensureInit();
    const ping = await db.execute('SELECT 1 AS ok');
    const events = await db.execute('SELECT COUNT(*) AS n FROM events');
    const logs   = await db.execute('SELECT COUNT(*) AS n FROM message_logs');
    result.db = {
      status:      'connected',
      ping:        ping.rows[0],
      eventsCount: (events.rows[0] as Record<string, unknown>).n,
      logsCount:   (logs.rows[0] as Record<string, unknown>).n,
    };
  } catch (err) {
    result.db = {
      status: 'error',
      error:  err instanceof Error ? err.message : String(err),
    };
  }

  // ── 3. Summary ────────────────────────────────────────────────────────────
  result.latencyMs = Date.now() - t0;
  result.timestamp = new Date().toISOString();
  result.node      = process.version;
  result.region    = process.env.VERCEL_REGION ?? 'unknown';

  return res.status(200).json(result);
}

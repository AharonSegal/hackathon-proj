/**
 * api/ping.ts — GET /api/ping
 * ----------------------------
 * Zero-dependency smoke test endpoint.
 *
 * Does not touch the database — useful for confirming the serverless
 * function runtime is alive after a deployment, without any DB dependency.
 *
 * Returns { pong: true, time: <ISO string>, v: 2 }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ pong: true, time: new Date().toISOString(), v: 2 });
}

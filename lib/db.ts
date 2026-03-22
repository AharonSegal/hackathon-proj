/**
 * lib/db.ts
 * ----------
 * Turso (libSQL / cloud SQLite) database client.
 *
 * Design: singleton pattern — one client instance per serverless cold start.
 * This avoids creating a new connection on every function invocation.
 *
 * Exports:
 * - ensureInit() — get the db client, creating tables if they don't exist yet
 * - rowToEvent() — convert a snake_case DB row to a camelCase CalendarEvent
 * - rowToLog()   — convert a snake_case DB row to a camelCase MessageLog
 *
 * Process Flow:
 * 1. First call to ensureInit() creates the libSQL client from env vars
 * 2. Runs CREATE TABLE IF NOT EXISTS for both tables (safe to call repeatedly)
 * 3. Sets _initialized = true — subsequent calls skip the CREATE TABLE step
 * 4. Returns the client ready for queries
 */

import { createClient, type Client } from '@libsql/client';

// ── Singleton client (one per cold start) ────────────────────────────────────

let _client: Client | undefined;
let _initialized = false;

function getClient(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error('TURSO_DATABASE_URL env var is not set');
    _client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

export async function ensureInit(): Promise<Client> {
  const db = getClient();
  if (_initialized) return db;

  // Create tables — IF NOT EXISTS makes this safe to call multiple times
  await db.execute(`
    CREATE TABLE IF NOT EXISTS events (
      id                 TEXT PRIMARY KEY,
      title              TEXT NOT NULL,
      description        TEXT,
      date               TEXT NOT NULL,
      start_time         TEXT,
      end_time           TEXT,
      color              TEXT DEFAULT 'indigo',
      all_day            INTEGER DEFAULT 1,
      scheduled_email    TEXT,
      scheduled_whatsapp TEXT,
      created_at         TEXT DEFAULT (datetime('now')),
      updated_at         TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS message_logs (
      id           TEXT PRIMARY KEY,
      type         TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      recipient    TEXT NOT NULL,
      subject      TEXT,
      message      TEXT,
      scheduled_at TEXT NOT NULL,
      sent_at      TEXT,
      error        TEXT,
      event_id     TEXT,
      created_at   TEXT DEFAULT (datetime('now'))
    )
  `);

  _initialized = true;
  return db;
}

// ── Row → camelCase response mappers ─────────────────────────────────────────

type Row = Record<string, unknown>;

export function rowToEvent(row: Row) {
  let scheduledEmail: unknown;
  let scheduledWhatsApp: unknown;

  if (row.scheduled_email && typeof row.scheduled_email === 'string') {
    try { scheduledEmail = JSON.parse(row.scheduled_email); } catch { /* ignore */ }
  }
  if (row.scheduled_whatsapp && typeof row.scheduled_whatsapp === 'string') {
    try { scheduledWhatsApp = JSON.parse(row.scheduled_whatsapp); } catch { /* ignore */ }
  }

  return {
    id:               row.id as string,
    title:            row.title as string,
    description:      (row.description as string | null) ?? undefined,
    date:             row.date as string,
    startTime:        (row.start_time as string | null) ?? undefined,
    endTime:          (row.end_time as string | null) ?? undefined,
    color:            (row.color as string) ?? 'indigo',
    allDay:           Boolean(row.all_day),
    scheduledEmail:   scheduledEmail,
    scheduledWhatsApp: scheduledWhatsApp,
    createdAt:        row.created_at as string,
    updatedAt:        row.updated_at as string,
  };
}

export function rowToLog(row: Row) {
  return {
    id:          row.id as string,
    type:        row.type as 'whatsapp' | 'email',
    status:      row.status as 'pending' | 'sent' | 'failed',
    recipient:   row.recipient as string,
    subject:     (row.subject as string | null) ?? undefined,
    message:     (row.message as string) ?? '',
    scheduledAt: row.scheduled_at as string,
    sentAt:      (row.sent_at as string | null) ?? undefined,
    error:       (row.error as string | null) ?? undefined,
    eventId:     (row.event_id as string | null) ?? undefined,
    createdAt:   row.created_at as string,
  };
}

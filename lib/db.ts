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
 * - rowToNote()  — convert a snake_case DB row to a camelCase Note
 *
 * Process Flow:
 * 1. First call to ensureInit() creates the libSQL client from env vars
 * 2. Runs CREATE TABLE IF NOT EXISTS for all tables (safe to call repeatedly)
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

  await db.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL DEFAULT 'Untitled Note',
      content    TEXT NOT NULL DEFAULT '[]',
      pinned     INTEGER NOT NULL DEFAULT 0,
      tags       TEXT NOT NULL DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS folders (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL DEFAULT 'New Folder',
      color      TEXT NOT NULL DEFAULT 'slate',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  try {
    await db.execute('ALTER TABLE notes ADD COLUMN folder_id TEXT');
  } catch { /* column already exists */ }

  // Add new columns to events (migrations – safe to run multiple times)
  const eventMigrations = [
    "ALTER TABLE events ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'",
    'ALTER TABLE events ADD COLUMN folder_id TEXT',
    "ALTER TABLE events ADD COLUMN recurrence TEXT NOT NULL DEFAULT 'none'",
    'ALTER TABLE events ADD COLUMN recurrence_end TEXT',
  ];
  for (const sql of eventMigrations) {
    try { await db.execute(sql); } catch { /* column already exists */ }
  }

  // Soft-delete support
  try { await db.execute('ALTER TABLE notes ADD COLUMN deleted_at TEXT'); } catch { /* already exists */ }
  try { await db.execute('ALTER TABLE events ADD COLUMN deleted_at TEXT'); } catch { /* already exists */ }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS trash (
      id          TEXT PRIMARY KEY,
      entity_id   TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      deleted_at  TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS todos (
      id              TEXT PRIMARY KEY,
      title           TEXT NOT NULL,
      description     TEXT,
      completed       INTEGER NOT NULL DEFAULT 0,
      completed_at    TEXT,
      due_date        TEXT,
      due_time        TEXT,
      deadline        TEXT,
      priority        INTEGER NOT NULL DEFAULT 4,
      location        TEXT,
      reminder_config TEXT,
      recurrence      TEXT NOT NULL DEFAULT 'none',
      recurrence_end  TEXT,
      project         TEXT NOT NULL DEFAULT 'Inbox',
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now'))
    )
  `);

  // Protective migrations — add columns that may be missing on older DBs
  const todoMigrations = [
    'ALTER TABLE todos ADD COLUMN completed_at TEXT',
    'ALTER TABLE todos ADD COLUMN created_at TEXT',
    'ALTER TABLE todos ADD COLUMN updated_at TEXT',
    'ALTER TABLE todos ADD COLUMN description TEXT',
    'ALTER TABLE todos ADD COLUMN due_date TEXT',
    'ALTER TABLE todos ADD COLUMN due_time TEXT',
    'ALTER TABLE todos ADD COLUMN deadline TEXT',
    "ALTER TABLE todos ADD COLUMN priority INTEGER NOT NULL DEFAULT 4",
    'ALTER TABLE todos ADD COLUMN location TEXT',
    'ALTER TABLE todos ADD COLUMN reminder_config TEXT',
    "ALTER TABLE todos ADD COLUMN recurrence TEXT NOT NULL DEFAULT 'none'",
    'ALTER TABLE todos ADD COLUMN recurrence_end TEXT',
    "ALTER TABLE todos ADD COLUMN project TEXT NOT NULL DEFAULT 'Inbox'",
  ];
  for (const sql of todoMigrations) {
    try { await db.execute(sql); } catch { /* already exists */ }
  }

  // ── Seed example data (INSERT OR IGNORE — idempotent on every cold start) ───
  const _d = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
  const _now = new Date().toISOString();

  // Sample todos
  for (const [id, title, days] of [
    ['SEED-TODO-001', 'Plan Shabbat dinner menu 🍽️',          2],
    ['SEED-TODO-002', 'Buy candles for Friday night 🕯️',      1],
    ['SEED-TODO-003', 'Send weekly status update to team',    0],
  ] as [string, string, number][]) {
    const ts = days === 0 ? _now : _d(days);
    await db.execute({
      sql: 'INSERT OR IGNORE INTO todos (id, title, completed, created_at, updated_at) VALUES (?, ?, 0, ?, ?)',
      args: [id, title, ts, ts],
    });
  }

  // Trashed note
  await db.execute({
    sql: 'INSERT OR IGNORE INTO notes (id, title, content, pinned, tags, deleted_at, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?, ?, ?)',
    args: ['SEED-TRASH-NOTE-001', 'Old Shopping List', '[]', '[]', _d(3), _d(7), _d(3)],
  });
  await db.execute({
    sql: 'INSERT OR IGNORE INTO trash (id, entity_id, entity_type, deleted_at) VALUES (?, ?, ?, ?)',
    args: ['SEED-TRASH-ENTRY-001', 'SEED-TRASH-NOTE-001', 'note', _d(3)],
  });

  // Trashed event
  await db.execute({
    sql: "INSERT OR IGNORE INTO events (id, title, date, color, all_day, tags, recurrence, deleted_at, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?)",
    args: ['SEED-TRASH-EVENT-001', 'Cancelled Team Meeting', '2026-03-10', 'rose', '[]', 'none', _d(5), _d(10), _d(5)],
  });
  await db.execute({
    sql: 'INSERT OR IGNORE INTO trash (id, entity_id, entity_type, deleted_at) VALUES (?, ?, ?, ?)',
    args: ['SEED-TRASH-ENTRY-002', 'SEED-TRASH-EVENT-001', 'event', _d(5)],
  });

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

  let tags: string[] = [];
  if (row.tags && typeof row.tags === 'string') {
    try { tags = JSON.parse(row.tags); } catch { /* ignore */ }
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
    tags,
    folderId:         (row.folder_id as string | null) ?? null,
    recurrence:       (row.recurrence as string) ?? 'none',
    recurrenceEnd:    (row.recurrence_end as string | null) ?? undefined,
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

export function rowToNote(row: Row) {
  let tags: string[] = [];
  if (row.tags && typeof row.tags === 'string') {
    try { tags = JSON.parse(row.tags); } catch { /* ignore */ }
  }
  return {
    id:        row.id as string,
    title:     row.title as string,
    content:   (row.content as string) ?? '[]',
    pinned:    Boolean(row.pinned),
    tags,
    folderId:  (row.folder_id as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function rowToFolder(row: Row) {
  return {
    id:        row.id as string,
    name:      row.name as string,
    color:     (row.color as string) ?? 'slate',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function rowToTrashNote(row: Row) {
  return {
    trashId:    row.trash_id as string,
    entityId:   row.id as string,
    entityType: 'note' as const,
    deletedAt:  row.deleted_at as string,
    title:      row.title as string,
    folderId:   (row.folder_id as string | null) ?? null,
  };
}

export function rowToTrashEvent(row: Row) {
  return {
    trashId:    row.trash_id as string,
    entityId:   row.id as string,
    entityType: 'event' as const,
    deletedAt:  row.deleted_at as string,
    title:      row.title as string,
    date:       row.date as string,
    folderId:   (row.folder_id as string | null) ?? null,
  };
}

export function rowToTodo(row: Row) {
  let reminderConfig = null;
  if (row.reminder_config && typeof row.reminder_config === 'string') {
    try { reminderConfig = JSON.parse(row.reminder_config); } catch { /* ignore */ }
  }
  return {
    id:            row.id as string,
    title:         row.title as string,
    description:   (row.description as string | null) ?? null,
    completed:     Boolean(row.completed),
    completedAt:   (row.completed_at as string | null) ?? null,
    dueDate:       (row.due_date as string | null) ?? null,
    dueTime:       (row.due_time as string | null) ?? null,
    deadline:      (row.deadline as string | null) ?? null,
    priority:      (row.priority as number | null) ?? 4,
    location:      (row.location as string | null) ?? null,
    reminderConfig,
    recurrence:    (row.recurrence as string | null) ?? 'none',
    recurrenceEnd: (row.recurrence_end as string | null) ?? null,
    project:       (row.project as string | null) ?? 'Inbox',
    createdAt:     row.created_at as string,
    updatedAt:     row.updated_at as string,
  };
}

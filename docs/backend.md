# API / Backend

TypeScript serverless functions deployed to Vercel, backed by Turso (cloud SQLite). No Docker, no Python, no local server required.

---

## Tech stack

| Library | Version | Purpose |
|---|---|---|
| `@vercel/node` | ^5 | Vercel serverless function types (`VercelRequest`, `VercelResponse`) |
| `@libsql/client` | ^0.14 | Turso / libSQL client for cloud SQLite |
| `nodemailer` | ^6.9 | SMTP email sending (STARTTLS + TLS) |
| `node:crypto` | built-in | `randomUUID()` for generating UUIDs |

---

## Project structure

`api/` and `lib/` live at the **repo root** (not inside `frontend/`). Vercel picks them up automatically.

```
api/                             Vercel serverless API routes
├── health.ts                    GET /api/health (+ DB ping)
├── ping.ts                      GET /api/ping (zero-dep smoke test)
├── debug.ts                     GET /api/debug (env vars + DB status + counts)
├── settings.ts                  POST /api/settings (stub)
├── events/
│   ├── index.ts                 GET + POST /api/events
│   └── [id].ts                  PUT + DELETE /api/events/:id
├── messages/
│   ├── logs.ts                  GET /api/messages/logs
│   ├── email/
│   │   ├── index.ts             POST /api/messages/email
│   │   └── test.ts              POST /api/messages/email/test
│   └── whatsapp/
│       ├── index.ts             POST /api/messages/whatsapp
│       └── test.ts              POST /api/messages/whatsapp/test
└── cron/
    └── send-messages.ts         Vercel Cron job (runs daily at 8am)

lib/
├── db.ts                        Turso client singleton + row mappers
├── email.ts                     nodemailer SMTP wrapper
└── whatsapp.ts                  Meta Graph API v21 wrapper
```

---

## API endpoints

All routes are served on the same Vercel domain as the React frontend.

### Health / diagnostics

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Returns `{"status":"ok","db":"ok","latencyMs":N}`. Pings the DB — `db` will be an error string if the connection fails. Used by the frontend poller every 30s. |
| GET | `/api/ping` | Returns `{"pong":true}`. Zero dependencies — useful for confirming the function runtime is alive without touching the DB. |
| GET | `/api/debug` | Returns full diagnostic JSON: all env var values (masked), DB connection status, event/log counts, latency, Node version, Vercel region. Use this first when debugging production issues. |

### Events

| Method | Path | Description |
|---|---|---|
| GET | `/api/events` | List all events. Optional `?year=&month=` to filter by month (`LIKE 'YYYY-MM%'`). |
| POST | `/api/events` | Create a new event. Returns the created event (camelCase). |
| PUT | `/api/events/:id` | Partial update — only fields present in the body are changed. |
| DELETE | `/api/events/:id` | Delete an event. Returns 204. |

### WhatsApp messages

| Method | Path | Description |
|---|---|---|
| POST | `/api/messages/whatsapp` | Send immediately (no `scheduleAt`) or queue for later. Creates a `message_logs` row. |
| POST | `/api/messages/whatsapp/test` | Send a test WhatsApp message. Used by the Settings test button. |

### Email messages

| Method | Path | Description |
|---|---|---|
| POST | `/api/messages/email` | Send immediately or queue for later. Accepts multiple recipients. Creates a `message_logs` row. |
| POST | `/api/messages/email/test` | Send a test email. Used by the Settings test button. |

### Message log

| Method | Path | Description |
|---|---|---|
| GET | `/api/messages/logs` | Returns last 200 `message_logs` rows, ordered by `scheduled_at DESC`. |

### Settings

| Method | Path | Description |
|---|---|---|
| POST | `/api/settings` | Stub — accepts settings JSON, does nothing (settings live in frontend localStorage). |

---

## Data models

### events table

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (UUID) | Primary key |
| `title` | TEXT | Required |
| `description` | TEXT | Optional |
| `date` | TEXT | `YYYY-MM-DD` |
| `start_time` | TEXT | `HH:mm`, null for all-day |
| `end_time` | TEXT | `HH:mm`, null for all-day |
| `color` | TEXT | One of: `indigo`, `emerald`, `amber`, `rose`, `sky`, `violet` |
| `all_day` | INTEGER | `1` = true, `0` = false |
| `scheduled_email` | TEXT | JSON-serialized email payload, or null |
| `scheduled_whatsapp` | TEXT | JSON-serialized WhatsApp payload, or null |
| `created_at` | TEXT | ISO datetime |
| `updated_at` | TEXT | ISO datetime |

### message_logs table

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (UUID) | Primary key |
| `type` | TEXT | `"whatsapp"` or `"email"` |
| `status` | TEXT | `"pending"`, `"sent"`, or `"failed"` |
| `recipient` | TEXT | Phone number or comma-separated emails |
| `subject` | TEXT | Email subject (null for WhatsApp) |
| `message` | TEXT | Message body |
| `scheduled_at` | TEXT | ISO datetime — when to send |
| `sent_at` | TEXT | ISO datetime — set on successful delivery |
| `error` | TEXT | Error message on failure |
| `event_id` | TEXT | Optional reference to the source event |
| `created_at` | TEXT | ISO datetime |

---

## DB singleton — `lib/db.ts`

`ensureInit()` is a lazy singleton pattern safe for serverless cold starts:

1. First call: creates the Turso `Client` from `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`.
2. Runs `CREATE TABLE IF NOT EXISTS` for both tables (idempotent).
3. Sets `_initialized = true` — subsequent calls return the cached client immediately.

`rowToEvent()` and `rowToLog()` convert snake_case database columns to camelCase JSON for API responses.

---

## Cron job — `api/cron/send-messages.ts`

Triggered by Vercel Cron on the schedule `0 8 * * *` (8am UTC daily).

> **Note**: Vercel Hobby plan only supports **daily** cron jobs. Hourly (`0 * * * *`) is a Pro plan feature and will silently block all new deployments if used on Hobby.

**Security**: Vercel sets `Authorization: Bearer <CRON_SECRET>` on every cron call. The handler rejects any request without this header.

**Logic per invocation**:
1. Query `message_logs WHERE status = 'pending' AND scheduled_at <= now`.
2. For each row, send via WhatsApp or email based on `type`.
3. On success: update `status = 'sent'`, `sent_at = now`.
4. On failure: update `status = 'failed'`, `error = <message>`.
5. Continue processing remaining rows regardless of individual failures.

---

## WhatsApp service — `lib/whatsapp.ts`

Calls Meta WhatsApp Business Cloud API v21:

```
POST https://graph.facebook.com/v21.0/{WHATSAPP_PHONE_NUMBER_ID}/messages
Authorization: Bearer {WHATSAPP_ACCESS_TOKEN}
Content-Type: application/json
```

Sends a `text` type message. Phone numbers must be in E.164 format (e.g. `+972501234567`). Non-2xx responses throw an `Error` with the HTTP status code.

**To get credentials:**
1. Create a Meta Developer account → add a WhatsApp Business app.
2. App dashboard → WhatsApp → API Setup → copy Phone Number ID and generate a permanent access token.
3. Register recipient numbers as test numbers during development.

---

## Email service — `lib/email.ts`

Uses `nodemailer` with a transporter configured from env vars:

- Port 465: `secure: true` (TLS from the start)
- Port 587 (default): `secure: false` + STARTTLS upgrade

**Gmail setup:**
1. Enable 2-Factor Authentication on your Google account.
2. Google Account → Security → App Passwords → generate one for "Mail".
3. Use that 16-character password as `SMTP_PASSWORD`.

---

## Environment variables

Set these in Vercel → Settings → Environment Variables.

| Variable | Description |
|---|---|
| `TURSO_DATABASE_URL` | `libsql://your-db.turso.io` — from Turso dashboard |
| `TURSO_AUTH_TOKEN` | Turso database auth token |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta phone number ID |
| `WHATSAPP_ACCESS_TOKEN` | Meta permanent access token |
| `SMTP_HOST` | SMTP server (default: `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (default: `587`) |
| `SMTP_USER` | SMTP username / email |
| `SMTP_PASSWORD` | SMTP password or app password |
| `EMAIL_FROM_NAME` | Display name in From header (default: `Calendar App`) |
| `CRON_SECRET` | Any random string — authenticates Vercel Cron calls |

See `.env.example` at the repo root for a copy-paste template.

---

## TypeScript config — `tsconfig.server.json`

API routes and `lib/` are compiled with `module: "CommonJS"` and `moduleResolution: "node"` because Vercel's Node.js runtime expects CommonJS modules (not ESM). This is separate from the frontend's `tsconfig.json` which uses `"module": "ESNext"`.

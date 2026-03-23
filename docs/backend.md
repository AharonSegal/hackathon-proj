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
├── settings.ts                  POST /api/settings (stub — settings live in localStorage)
├── events/
│   ├── index.ts                 GET + POST /api/events
│   └── [id].ts                  PUT + DELETE /api/events/:id
├── notes/
│   ├── index.ts                 GET + POST /api/notes
│   └── [id].ts                  PUT + DELETE /api/notes/:id
├── todos/
│   ├── index.ts                 GET + POST /api/todos
│   └── [id].ts                  PUT + DELETE /api/todos/:id
├── folders/
│   ├── index.ts                 GET + POST /api/folders
│   └── [id].ts                  PUT + DELETE /api/folders/:id
├── trash/
│   ├── index.ts                 GET + DELETE /api/trash
│   └── [id].ts                  PUT + DELETE /api/trash/:id
└── messages/
    └── [...path].ts             catch-all — handles all /api/messages/* routes

lib/
├── db.ts                        Turso client singleton + row mappers
├── email.ts                     nodemailer SMTP wrapper
└── whatsapp.ts                  Meta Graph API v21 wrapper
```

---

## API endpoints

All routes are served on the same Vercel domain as the React frontend.

### Events

| Method | Path | Description |
|---|---|---|
| GET | `/api/events` | List active events. Optional `?year=&month=` to filter by month. |
| POST | `/api/events` | Create a new event. Required: `title`, `date`. Returns the created event. |
| PUT | `/api/events/:id` | Partial update — only fields in the body are changed. |
| DELETE | `/api/events/:id` | Soft-delete (sets `deleted_at`, inserts to `trash`). Returns 204. |

### Notes

| Method | Path | Description |
|---|---|---|
| GET | `/api/notes` | List active notes (pinned first, then by updated_at). |
| POST | `/api/notes` | Create a new note. Optional `id` for restore-from-trash. |
| PUT | `/api/notes/:id` | Partial update (title, content, pinned, tags, folderId). |
| DELETE | `/api/notes/:id` | Soft-delete (sets `deleted_at`, inserts to `trash`). Returns 204. |

### Todos

| Method | Path | Description |
|---|---|---|
| GET | `/api/todos` | List all todos (created_at DESC). |
| POST | `/api/todos` | Create a new todo. Required: `title`. Optional `id` for restore. |
| PUT | `/api/todos/:id` | Partial update via field map (title, completed, dueDate, priority, …). |
| DELETE | `/api/todos/:id` | Hard delete (permanent). Returns 204. |

### Folders

| Method | Path | Description |
|---|---|---|
| GET | `/api/folders` | List all folders (created_at ASC). |
| POST | `/api/folders` | Create a folder. Required: `name`, `color`. |
| PUT | `/api/folders/:id` | Update name/color. |
| DELETE | `/api/folders/:id` | Delete folder and null out `folder_id` on all its notes. |

### Trash

| Method | Path | Description |
|---|---|---|
| GET | `/api/trash` | List soft-deleted notes and events joined from the source tables. |
| PUT | `/api/trash/:id` | Restore: clears `deleted_at` on source row, deletes trash entry. |
| DELETE | `/api/trash/:id` | Permanent delete: removes source row and trash entry. |
| DELETE | `/api/trash` | Empty trash: permanently deletes all soft-deleted notes and events. |

### Messages (catch-all `api/messages/[...path].ts`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/messages/logs` | Last 200 `message_logs` rows ordered by `scheduled_at DESC`. |
| POST | `/api/messages/whatsapp` | Send immediately (no `scheduleAt`) or queue for later. Logs to `message_logs`. |
| POST | `/api/messages/whatsapp?test=true` | Test WhatsApp send — no DB write. |
| POST | `/api/messages/email` | Send or queue email. `to` must be an array. Logs to `message_logs`. |
| POST | `/api/messages/email?test=true` | Test email send — no DB write. |
| GET/POST | `/api/messages/cron` | Vercel Cron trigger: sends all pending messages where `scheduled_at <= now()`. |

### Settings

| Method | Path | Description |
|---|---|---|
| POST | `/api/settings` | Stub — accepts JSON, does nothing. Settings live in frontend localStorage. |

---

## DB singleton — `lib/db.ts`

`ensureInit()` is a lazy singleton pattern safe for serverless cold starts:

1. First call: creates the Turso `Client` from `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`.
2. Runs `CREATE TABLE IF NOT EXISTS` for all 6 tables (idempotent).
3. Runs backward-compat `ALTER TABLE` migrations in try/catch (safe to re-run).
4. Seeds 3 demo todos + 1 trashed note + 1 trashed event with `INSERT OR IGNORE`.
5. Sets `_initialized = true` — subsequent calls return the cached client immediately.

Row mappers (`rowToEvent`, `rowToNote`, `rowToTodo`, `rowToFolder`, `rowToLog`, `rowToTrashNote`, `rowToTrashEvent`) convert snake_case DB columns to camelCase for API responses.

See [database.md](database.md) for the full schema.

---

## Cron job — `api/messages/[...path].ts` (route: `cron`)

Triggered by Vercel Cron on the schedule `0 8 * * *` (8am UTC daily), configured in `vercel.json`.

> **Note**: Vercel Hobby plan only supports **daily** cron jobs. Hourly is a Pro plan feature.

**Security**: If `CRON_SECRET` is set, the handler requires `Authorization: Bearer <CRON_SECRET>`. Vercel sets this automatically on cron calls.

**Logic per invocation**:
1. Query `message_logs WHERE status = 'pending' AND scheduled_at <= now`.
2. For each row, send via WhatsApp or email based on `type`.
3. On success: update `status = 'sent'`, `sent_at = now`.
4. On failure: update `status = 'failed'`, `error = <message>`.
5. Returns `{ processed, results[] }`.

---

## WhatsApp service — `lib/whatsapp.ts`

Calls Meta WhatsApp Business Cloud API v21:

```
POST https://graph.facebook.com/v21.0/{WHATSAPP_PHONE_NUMBER_ID}/messages
Authorization: Bearer {WHATSAPP_ACCESS_TOKEN}
Content-Type: application/json
```

Phone numbers must be E.164 format (e.g. `+972501234567`). Non-2xx responses throw an `Error`.

**To get credentials:**
1. Create a Meta Developer account → add a WhatsApp Business app.
2. App dashboard → WhatsApp → API Setup → copy Phone Number ID and generate a permanent access token.
3. Register recipient numbers as test numbers during development.

---

## Email service — `lib/email.ts`

Uses `nodemailer` configured from env vars:

- Port 465: `secure: true` (TLS)
- Port 587 (default): `secure: false` + STARTTLS upgrade

**Gmail setup:**
1. Enable 2-Factor Authentication.
2. Google Account → Security → App Passwords → generate for "Mail".
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

API routes and `lib/` are compiled with `module: "CommonJS"` and `moduleResolution: "node"` because Vercel's Node.js runtime expects CommonJS (not ESM). This is separate from the frontend's `tsconfig.json` which uses `"module": "ESNext"`.

# Backend Suggestions

Ideas to improve the API, database, and infrastructure.

---

## Already Built ✅

- **Soft deletes for notes and events** — `deleted_at TEXT` column; GET endpoints filter `WHERE deleted_at IS NULL`; DELETE sets `deleted_at` and inserts into `trash` table
- **Trash table** — `id, entity_id, entity_type, deleted_at`; restore via `PUT /api/trash/:id`; perm delete via `DELETE /api/trash/:id`; empty all via `DELETE /api/trash`
- **Todos CRUD** — full `GET/POST /api/todos` + `PUT/DELETE /api/todos/:id` with `completed`, `completed_at`, `created_at`, `updated_at`
- **Folders CRUD** — full `GET/POST /api/folders` + `PUT/DELETE /api/folders/:id`
- **Messages consolidated** — all message routes merged into `api/messages/[...path].ts` (logs, whatsapp, email, cron) to stay within Vercel Hobby 12-function limit
- **Protective migrations** — `ensureInit()` runs idempotent `ALTER TABLE ADD COLUMN` for every new column; safe to call on every cold start

---

## Todos

- **Todos soft-delete** — add `deleted_at TEXT` to `todos` table; `DELETE /api/todos/:id` should soft-delete + insert into `trash`; restore via TrashPage like notes and events
- **Due date column** — `ALTER TABLE todos ADD COLUMN due_date TEXT`; expose in `GET/POST/PUT /api/todos`; cron can send reminders when `due_date = today`
- **Priority column** — `ALTER TABLE todos ADD COLUMN priority INTEGER DEFAULT 0` (0=none, 1=low, 2=medium, 3=high); sort active todos by priority DESC
- **Order column** — `ALTER TABLE todos ADD COLUMN sort_order INTEGER` for drag-and-drop reordering; update via `PUT /api/todos/:id { sortOrder }`
- **Folder support** — `ALTER TABLE todos ADD COLUMN folder_id TEXT` to organise todos into the same folders as notes/events

## Notes & Attachments

- **Attachments table** — `CREATE TABLE attachments (id, entity_id, entity_type, name, mime_type, size, url, created_at)`; move away from localStorage; upload to Vercel Blob / Cloudflare R2 and store the URL
- **`POST /api/attachments`** — upload endpoint that streams the file to blob storage and returns the record
- **`DELETE /api/attachments/:id`** — delete from blob storage and remove the DB row
- **Note versions** — `CREATE TABLE note_versions (id, note_id, content, created_at)`; snapshot on every save; expose `GET /api/notes/:id/versions`

## API & Endpoints

- **Pagination** — `GET /api/events` and `GET /api/messages/logs` return all rows; add `?page=&limit=` or `?cursor=` before the dataset grows large
- **Event date-range filter** — `GET /api/events?from=&to=` so the frontend fetches only the visible month; already partially implemented with `?year=&month=`
- **Todos filter** — `GET /api/todos?completed=false` to fetch only active todos instead of always fetching all and filtering client-side
- **Batch operations** — `DELETE /api/events/batch` and `PUT /api/events/batch` for bulk actions without N individual HTTP calls
- **Scheduled message cancellation** — `DELETE /api/messages/logs/:id` to cancel a pending message before the cron fires
- **Rate limiting** — per-IP rate limiting on `/api/messages/whatsapp` and `/api/messages/email` to prevent accidental spam loops
- **Input sanitization** — strip HTML from event/note titles before storing (currently verbatim, XSS risk if rendered as HTML)

## Database

- **Indexes** — add indexes on `events(date)`, `message_logs(scheduled_at, status)`, `todos(completed)`, `trash(entity_id)` to speed up filtered queries
- **Trash auto-cleanup** — cron job (`/api/messages/cron`) or a separate schedule to `DELETE FROM trash WHERE deleted_at < datetime('now', '-30 days')` and hard-delete the corresponding rows
- **Full-text search** — SQLite FTS5 virtual table on `notes(title, content)` and `todos(title)` for fast search queries
- **Migration system** — replace the inline `ALTER TABLE` try/catch in `ensureInit()` with numbered SQL files (e.g. `migrations/001_add_deleted_at.sql`) applied in order with a `schema_version` table
- **Turso backups** — schedule regular `.dump` exports to S3 / R2 for disaster recovery

## Security

- **Authentication** — no login exists; add a simple auth layer (Clerk, Auth.js, or a hardcoded API key in an env var) so only the owner can modify data
- **CORS headers** — add explicit `Access-Control-Allow-Origin` headers to all serverless functions
- **Environment variable validation** — validate all required env vars at cold start (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, etc.) and log a clear error rather than failing silently mid-request
- **CRON_SECRET rotation** — document a process for rotating the cron secret without downtime; the cron path is now `/api/messages/cron`
- **Webhook signature verification** — when WhatsApp delivery webhook is added, verify `X-Hub-Signature-256` from Meta

## Cron & Scheduling

- **Retry logic** — retry failed messages up to 3 times with exponential backoff before marking `failed`
- **Cron execution log** — write a summary of each cron run to a `cron_logs` table (messages sent, failed, timestamp)
- **Multiple send windows** — configure multiple daily cron times (e.g. 8am + 8pm) via additional `vercel.json` cron entries
- **Due-date reminders** — on cron run, query `todos WHERE due_date = today AND completed = 0` and send a WhatsApp/email summary

## Infrastructure

- **Vercel Pro plan** — upgrade to unlock hourly cron jobs, larger function bundles, better log retention, and more than 12 serverless functions
- **Edge functions** — move lightweight read endpoints (`GET /api/events`, `GET /api/todos`) to Vercel Edge Runtime for lower latency
- **Monitoring / alerting** — integrate Sentry so unhandled errors in API routes are reported with a stack trace
- **Preview deployments** — Vercel auto-deploys PRs to a unique URL; use these for testing before merging to main
- **Custom domain** — configure a custom domain instead of `*.vercel.app`

# Backend Suggestions

Ideas to improve the API, database, and infrastructure.

---

## API & Endpoints

- **Pagination for events and logs** — `GET /api/events` and `GET /api/messages/logs` currently return all rows. Add `?page=&limit=` or `?cursor=` parameters before the dataset grows large
- **Event filtering** — add `?from=&to=` date range filters to `/api/events` so the frontend can fetch only the visible month rather than all events
- **Batch operations** — `DELETE /api/events/batch` and `PUT /api/events/batch` for bulk delete/update without N individual HTTP calls
- **WebSockets / SSE** — push real-time message status updates to the frontend instead of polling every 30s (`useBackendStatus` + `messageApi.getLogs`)
- **Rate limiting** — add per-IP rate limiting on the send endpoints (`/api/messages/whatsapp`, `/api/messages/email`) to prevent accidental spam loops
- **Input sanitization** — strip or escape HTML in event titles/descriptions before storing (currently stored verbatim)

## Database

- **Indexes** — add a DB index on `events.date` and `message_logs.scheduled_at` + `status` to speed up the queries that filter by those columns
- **Soft deletes** — instead of `DELETE FROM events`, add a `deleted_at` column so events can be recovered (useful for the "undo delete" UX feature)
- **Database migrations** — replace the `CREATE TABLE IF NOT EXISTS` approach in `ensureInit()` with a proper migration system (e.g. numbered SQL migration files) so schema changes can be applied safely
- **Turso backups** — schedule regular `.dump` exports and store them in S3 / R2 for disaster recovery
- **Connection pooling** — the current singleton is recreated on every cold start; consider using `@libsql/client` with a persistent HTTP connection or Turso's embedded replicas for faster local reads

## Security

- **Authentication** — the app currently has no login. Add a simple auth layer (e.g. Clerk, Auth.js, or a hardcoded API key) so only the owner can add/edit events or send messages
- **CORS headers** — Vercel serverless functions don't add CORS headers by default; add them explicitly so the API can be called from other origins if needed
- **Environment variable validation on startup** — validate all required env vars at cold start and log a clear error if any are missing, rather than failing silently mid-request
- **CRON_SECRET rotation** — document a process for rotating the cron secret without downtime
- **Webhook signature verification** — when adding WhatsApp delivery webhook, verify the `X-Hub-Signature-256` header from Meta before processing

## Cron & Scheduling

- **Retry logic** — if a message fails to send, retry it up to 3 times with exponential backoff before marking it `failed`
- **Multiple send windows** — allow configuring multiple daily cron times (e.g. 8am + 8pm) by adding a second Vercel Cron entry in `vercel.json`
- **Scheduled message cancellation** — add a `DELETE /api/messages/logs/:id` endpoint to cancel a pending scheduled message before it fires
- **Cron execution log** — write a summary of each cron run (how many sent, how many failed) to a `cron_logs` table for debugging

## Infrastructure

- **Vercel Pro plan** — upgrade to unlock hourly cron jobs, larger function bundles, and better log retention
- **Edge functions** — move `/api/ping` and `/api/health` to Vercel Edge Runtime (faster, runs at the CDN edge instead of a region server)
- **Monitoring / alerting** — integrate Sentry (or Vercel's built-in error tracking) so unhandled errors in API routes are reported with a stack trace
- **Custom domain** — configure a custom domain in Vercel instead of `*.vercel.app`
- **Preview deployments** — Vercel auto-deploys PRs to a unique URL; use these for testing before merging to main

# Changelog

---

## [2.2.0] — Calendar redesign + WhatsApp composer upgrade

### Calendar

- **Click any day → add event**: clicking a day cell now always opens the "New Event" modal for that date (previously only worked on empty days)
- **Click event pill → edit event**: clicking an existing event pill opens its edit modal (propagation stops so the day-click doesn't also fire)
- **Colored dot indicators**: bottom-right corner of each cell shows one colored dot per event (up to 3), using the event's own color
- **`+` hover hint**: empty days show a subtle `+` on hover to indicate you can click to add
- **Bigger cells**: `min-h` increased from 90px to 110px; uppercase day-of-week headers
- **Holiday labels**: trimmed to max 1 per cell (was 2) for a cleaner look

### WhatsApp composer

- **Formatting toolbar**: Bold (`*text*`), Italic (`_text_`), Strikethrough (`~text~`), Monospace (` ```text``` `) — wraps selected text or places cursor between markers
- **Emoji picker**: 48 common emojis in a popup grid; click to insert at cursor position
- **Always-visible phone preview**: WhatsApp phone-frame preview moved from a toggle to a permanent right-column beside the editor; renders WhatsApp markdown in real-time
- **Messages layout**: WhatsApp tab is now full-width (composer + preview), message log moved below; Email tab keeps the 2-column layout (composer | log)

### Backend

- **`/api/health` now tests the DB**: previously returned `{"status":"ok"}` with no DB check; now pings the DB and returns `{"status":"ok","db":"ok","latencyMs":N}` — `db` contains the error string if the connection fails
- **Cron schedule changed**: `0 * * * *` (hourly) → `0 8 * * *` (8am daily). Reason: Vercel Hobby plan blocks hourly crons, causing all new deployments to fail silently.

### Docs

- All docs updated to reflect current file locations (`api/` and `lib/` at repo root, not `frontend/api/`)
- `deploy.md`: corrected Vercel project settings (Root Directory `./`, correct build/install commands)
- `deploy.md`: added Hobby plan cron limitation warning
- `backend.md`: health endpoint description updated; added `/api/ping` and `/api/debug` endpoints
- `running-locally.md`: corrected install steps and `vercel dev` directory (run from repo root)

---

## [2.0.0] — Architecture migration: Python → TypeScript + Vercel + Turso

### Removed
- **Python FastAPI backend** — entire `backend/` directory (FastAPI, SQLAlchemy, Pydantic, APScheduler, aiosmtplib, httpx)
- **Docker** — `Dockerfile`, `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `nginx.conf`
- **Cloudflare Tunnel** — no longer needed; API routes are on the same Vercel domain
- `VITE_API_URL` environment variable — removed from frontend; all requests now go to same-origin `/api`
- Vite `/api` proxy to `localhost:8000` — removed from `vite.config.ts`

### Added — API layer (`api/`)

New TypeScript Vercel serverless functions replacing all Python routes:

| File | Route |
|---|---|
| `api/health.ts` | `GET /api/health` |
| `api/ping.ts` | `GET /api/ping` |
| `api/debug.ts` | `GET /api/debug` |
| `api/settings.ts` | `POST /api/settings` (stub) |
| `api/events/index.ts` | `GET + POST /api/events` |
| `api/events/[id].ts` | `PUT + DELETE /api/events/:id` |
| `api/messages/logs.ts` | `GET /api/messages/logs` |
| `api/messages/email/index.ts` | `POST /api/messages/email` |
| `api/messages/email/test.ts` | `POST /api/messages/email/test` |
| `api/messages/whatsapp/index.ts` | `POST /api/messages/whatsapp` |
| `api/messages/whatsapp/test.ts` | `POST /api/messages/whatsapp/test` |
| `api/cron/send-messages.ts` | Vercel Cron — sends pending messages |

### Added — Server-side libraries (`lib/`)

- `lib/db.ts` — Turso `@libsql/client` singleton with `ensureInit()` (lazy `CREATE TABLE IF NOT EXISTS`), `rowToEvent()` and `rowToLog()` row mappers (snake_case DB → camelCase JSON)
- `lib/email.ts` — `nodemailer` SMTP wrapper; supports STARTTLS (port 587) and TLS (port 465)
- `lib/whatsapp.ts` — Meta Graph API v21 `fetch`-based wrapper

### Added — Configuration

- `vercel.json` (repo root) — SPA rewrite rule + Vercel Cron schedule
- `tsconfig.server.json` (repo root) — separate TS config for `api/` and `lib/` (`module: CommonJS`, `moduleResolution: node`)
- `.env.example` (repo root) — template for all required environment variables
- New npm dependencies: `@libsql/client`, `nodemailer`, `@types/nodemailer`, `@vercel/node`

### Changed — Frontend

- `useApi.ts` — removed `VITE_API_URL` dependency; `baseURL` is always `/api`
- `useBackendStatus.ts` — simplified health ping: `axios.get('/api/health')` (no conditional URL logic)
- `AppLayout.tsx` — fixed `main` element class: `overflow-y-auto` → `flex flex-col overflow-hidden` to restore the `h-full` chain needed by CalendarPage
- `DashboardPage.tsx` — added `overflow-y-auto flex-1` to root div for proper scroll inside the layout

### Fixed — Bugs

- **Calendar not rendering** — `main` tag in `AppLayout.tsx` had `overflow-y-auto` breaking the flex/height chain. Fixed to `flex flex-col overflow-hidden`.
- **camelCase/snake_case mismatch** — Python backend returned `start_time`, `all_day`, `scheduled_email`; frontend expected `startTime`, `allDay`, `scheduledEmail`. Fixed in `rowToEvent()` mapper.
- **`crypto.randomUUID()` global missing** — Changed to explicit `import { randomUUID } from 'node:crypto'` in all three API route files that generate UUIDs.
- **Dynamic Tailwind class `bg-${color}-500`** — Tailwind JIT cannot detect dynamically interpolated class names. Replaced with static `COLOR_DOT` lookup object in `DashboardPage.tsx`.

### Fixed — Validation

- `api/messages/email/index.ts` — added email format validation (regex) before attempting to send
- `api/messages/whatsapp/index.ts` — added E.164 phone number format validation
- `api/events/index.ts` — added null check after INSERT + SELECT

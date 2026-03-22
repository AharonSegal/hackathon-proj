# Changelog

---

## [2.0.0] — Architecture migration: Python → TypeScript + Vercel + Turso

### Removed
- **Python FastAPI backend** — entire `backend/` directory (FastAPI, SQLAlchemy, Pydantic, APScheduler, aiosmtplib, httpx)
- **Docker** — `Dockerfile`, `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `nginx.conf`
- **Cloudflare Tunnel** — no longer needed; API routes are on the same Vercel domain
- `VITE_API_URL` environment variable — removed from frontend; all requests now go to same-origin `/api`
- Vite `/api` proxy to `localhost:8000` — removed from `vite.config.ts`

### Added — API layer (`frontend/api/`)

New TypeScript Vercel serverless functions replacing all Python routes:

| File | Route |
|---|---|
| `api/health.ts` | `GET /api/health` |
| `api/settings.ts` | `POST /api/settings` (stub) |
| `api/events/index.ts` | `GET + POST /api/events` |
| `api/events/[id].ts` | `PUT + DELETE /api/events/:id` |
| `api/messages/logs.ts` | `GET /api/messages/logs` |
| `api/messages/email/index.ts` | `POST /api/messages/email` |
| `api/messages/email/test.ts` | `POST /api/messages/email/test` |
| `api/messages/whatsapp/index.ts` | `POST /api/messages/whatsapp` |
| `api/messages/whatsapp/test.ts` | `POST /api/messages/whatsapp/test` |
| `api/cron/send-messages.ts` | Vercel Cron — sends pending messages |

### Added — Server-side libraries (`frontend/lib/`)

- `lib/db.ts` — Turso `@libsql/client` singleton with `ensureInit()` (lazy `CREATE TABLE IF NOT EXISTS`), `rowToEvent()` and `rowToLog()` row mappers (snake_case DB → camelCase JSON)
- `lib/email.ts` — `nodemailer` SMTP wrapper; supports STARTTLS (port 587) and TLS (port 465)
- `lib/whatsapp.ts` — Meta Graph API v21 `fetch`-based wrapper

### Added — Configuration

- `frontend/vercel.json` — SPA rewrite rule + Vercel Cron schedule (`0 * * * *`)
- `frontend/tsconfig.server.json` — separate TS config for `api/` and `lib/` (`module: CommonJS`, `moduleResolution: node`)
- `.env.example` (repo root) — template for all 10 required environment variables
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

### Updated — Documentation (`docs/`)

All documentation has been rewritten to reflect the current TypeScript/Vercel/Turso architecture:

- `docs/general.md` — updated architecture diagram and repo layout (removed Docker/tunnel, added `api/` and `lib/` trees)
- `docs/frontend.md` — updated API communication section (no more `VITE_API_URL`/proxy), added note on static Tailwind color maps, updated SPA routing section
- `docs/backend.md` — completely rewritten: now documents TypeScript API routes, Turso schema, DB singleton, Cron job, WhatsApp/email services, and env vars
- `docs/running-locally.md` — completely rewritten: now documents `vercel dev` workflow; removed all Docker/Python/venv instructions
- `docs/deploy.md` — completely rewritten: now documents Turso setup, Vercel env vars, and Vercel Cron; removed Cloudflare Tunnel, Docker, and `VITE_API_URL` instructions

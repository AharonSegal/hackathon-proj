# Calendar App

A personal full-stack calendar with Hebrew/Gregorian dual-calendar support, Jewish daily prayer times (zmanim), and built-in WhatsApp & email scheduling — built for Jewish life management.

---

## What it is

A single-user web app. You get a calendar that speaks both Hebrew and Gregorian, shows Jewish holidays and the weekly parasha automatically, lets you attach scheduled WhatsApp messages or emails to any event, and displays halachic times for your location every day. The frontend is always functional — even when offline it shows cached data and gracefully reports the connection state.

---

## Architecture

```
User's browser
      │  HTTPS
      ▼
┌─────────────────────────────────┐
│  Vercel                          │
│  React SPA  +  API routes        │
│  (TypeScript serverless fns)     │
└────────────┬────────────────────┘
             │  libsql over HTTPS
             ▼
┌─────────────────────────────────┐
│  Turso                           │
│  cloud SQLite database           │
│  (managed, always-on)            │
└─────────────────────────────────┘
```

- **Frontend** — React 18 + TypeScript + Vite, deployed to Vercel
- **API** — TypeScript Vercel serverless functions in `api/` (repo root)
- **Database** — Turso (cloud SQLite via `@libsql/client`) — no Docker, no local server
- **Messaging** — Meta WhatsApp Business Cloud API (Graph API v21) + SMTP via `nodemailer`
- **Scheduling** — Vercel Cron Job (`0 8 * * *`) fires once daily at 8am to send pending messages

---

## Repository layout

```
hackathon-proj/
├── api/                        Vercel serverless API routes (repo root)
│   ├── health.ts               GET /api/health (includes DB ping)
│   ├── ping.ts                 GET /api/ping (zero-dependency smoke test)
│   ├── debug.ts                GET /api/debug (env vars + DB status)
│   ├── settings.ts             POST /api/settings (stub)
│   ├── events/
│   │   ├── index.ts            GET + POST /api/events
│   │   └── [id].ts             PUT + DELETE /api/events/:id
│   ├── messages/
│   │   ├── logs.ts             GET /api/messages/logs
│   │   ├── email/
│   │   │   ├── index.ts        POST /api/messages/email
│   │   │   └── test.ts         POST /api/messages/email/test
│   │   └── whatsapp/
│   │       ├── index.ts        POST /api/messages/whatsapp
│   │       └── test.ts         POST /api/messages/whatsapp/test
│   └── cron/
│       └── send-messages.ts    Vercel Cron: send pending messages
├── lib/                        Shared server-side helpers (repo root)
│   ├── db.ts                   Turso client singleton + row mappers
│   ├── email.ts                nodemailer SMTP sender
│   └── whatsapp.ts             Meta Graph API WhatsApp sender
├── frontend/                   React SPA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Calendar/       Hebrew/Gregorian calendar grid + event modal
│   │   │   ├── Dashboard/      Stats, today's events, upcoming events
│   │   │   ├── DailyTimes/     Halachic zmanim for any location
│   │   │   ├── Messages/       WhatsApp + email composer and log
│   │   │   └── Settings/       All app configuration
│   │   └── shared/
│   │       ├── components/     Button, Modal, Input, Badge, Sidebar, Layout
│   │       ├── hooks/          useApi (with cache), useBackendStatus
│   │       ├── context/        SettingsContext (localStorage-backed)
│   │       ├── types/          event.types.ts, settings.types.ts
│   │       └── colors/         Shared color palette constants
│   └── package.json
├── vercel.json                 SPA rewrite + cron schedule (repo root)
├── tsconfig.server.json        TS config for api/ and lib/ (CommonJS)
├── package.json                Root deps: @libsql/client, nodemailer, @vercel/node
├── docs/                       All project documentation
│   ├── general.md              ← you are here
│   ├── frontend.md             Frontend deep-dive
│   ├── backend.md              API routes + server-side deep-dive
│   ├── running-locally.md      Local dev guide
│   ├── deploy.md               Vercel + Turso production setup
│   ├── turso-setup.md          Step-by-step Turso database setup
│   └── CHANGELOG.md            Change history
└── .env.example                All required environment variables
```

---

## Feature summary

| Feature | Detail |
|---|---|
| Hebrew calendar | Grid starts on 1st of Hebrew month; gematriya numerals (א׳–ל׳); all months incl. leap-year Adar I/II |
| Gregorian calendar | Standard grid; switchable per-session in Settings |
| Jewish holidays | Major/minor holidays, Rosh Chodesh, Shabbat highlight, parashat hashavua, Omer count, Israeli national holidays, diaspora mode |
| Events | Create/edit/delete with title, description, time slot, 6 color options. Click any day to add, click an event pill to edit. |
| Event indicators | Colored dots (bottom-right of each cell) show how many events a day has |
| Scheduled messaging | Attach a WhatsApp message and/or email to any event; pick exact send datetime |
| WhatsApp composer | Formatting toolbar (bold, italic, strikethrough, monospace), emoji picker, live phone-frame preview, Hebrew quick-templates, immediate or scheduled send |
| Email composer | Multi-recipient tag input, immediate or scheduled send |
| Daily Times | 11 configurable halachic times (Alot HaShachar → Tzet Shabbat) for any lat/lng/timezone |
| Settings | Calendar mode, week start, 10 holiday toggles, 11 zmanim toggles, location, SMTP config, WhatsApp credentials |
| Offline resilience | localStorage cache for events + message logs; "Backend offline" pill; frontend never crashes |
| Cron scheduling | Vercel Cron fires once daily at 8am (`0 8 * * *`), picks up all pending messages whose `scheduled_at` has passed |

---

## Docs

- Run everything locally → [running-locally.md](running-locally.md)
- Live deployment setup → [deploy.md](deploy.md)
- Turso database setup → [turso-setup.md](turso-setup.md)
- Frontend deep-dive → [frontend.md](frontend.md)
- API/backend deep-dive → [backend.md](backend.md)
- Change history → [CHANGELOG.md](CHANGELOG.md)

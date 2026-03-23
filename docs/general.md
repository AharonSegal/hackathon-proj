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
│   ├── settings.ts             POST /api/settings (stub)
│   ├── events/
│   │   ├── index.ts            GET + POST /api/events
│   │   └── [id].ts             PUT + DELETE /api/events/:id
│   ├── notes/
│   │   ├── index.ts            GET + POST /api/notes
│   │   └── [id].ts             PUT + DELETE /api/notes/:id
│   ├── todos/
│   │   ├── index.ts            GET + POST /api/todos
│   │   └── [id].ts             PUT + DELETE /api/todos/:id
│   ├── folders/
│   │   ├── index.ts            GET + POST /api/folders
│   │   └── [id].ts             PUT + DELETE /api/folders/:id
│   ├── trash/
│   │   ├── index.ts            GET + DELETE /api/trash
│   │   └── [id].ts             PUT + DELETE /api/trash/:id
│   └── messages/
│       └── [...path].ts        catch-all: logs, whatsapp, email, cron
├── lib/                        Shared server-side helpers (repo root)
│   ├── db.ts                   Turso client singleton + row mappers
│   ├── email.ts                nodemailer SMTP sender
│   └── whatsapp.ts             Meta Graph API WhatsApp sender
├── frontend/                   React SPA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Calendar/       Hebrew/Gregorian calendar grid + event modal (shows events + todos)
│   │   │   ├── Dashboard/      Stats, today's events, upcoming todos, diagnostics
│   │   │   ├── DailyTimes/     Halachic zmanim for any location
│   │   │   ├── Events/         Alternate events list view
│   │   │   ├── Messages/       WhatsApp + email composer and log
│   │   │   ├── Notes/          BlockNote rich-text editor, DB-backed
│   │   │   ├── Todos/          Task editor with scheduling, priority, reminders
│   │   │   ├── Trash/          Soft-delete recovery for notes and events
│   │   │   └── Settings/       Language, calendar, zmanim, SMTP, WhatsApp credentials
│   │   └── shared/
│   │       ├── components/     Button, Modal, Input, Badge, Sidebar, Layout, MobileNav
│   │       ├── hooks/          useApi (with cache), useBackendStatus, useIsMobile
│   │       ├── context/        SettingsContext, NotesContext, EventsContext, TodosContext, FoldersContext
│   │       ├── i18n/           translations.ts (en/he), useT() hook
│   │       ├── types/          event.types.ts, settings.types.ts, note.types.ts
│   │       └── colors/         Shared color palette constants
│   └── package.json
├── vercel.json                 SPA rewrite + cron schedule (repo root)
├── tsconfig.server.json        TS config for api/ and lib/ (CommonJS)
├── package.json                Root deps: @libsql/client, nodemailer, @vercel/node
├── docs/                       All project documentation
│   ├── general.md              ← you are here
│   ├── frontend.md             Frontend deep-dive
│   ├── backend.md              API routes + server-side deep-dive
│   ├── database.md             Schema, migrations, ER diagram
│   ├── running-locally.md      Local dev guide
│   ├── deploy.md               Vercel + Turso production setup
│   └── turso-setup.md          Step-by-step Turso database setup
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
| Notes | BlockNote rich-text editor with title, tags, pin, folder grouping, and soft-delete. Desktop: split panel. Mobile: single column. DB-backed with localStorage cache. |
| Todos | Task editor with due date/time, hard deadline, priority (P1–P4), location, recurrence, reminders, and project grouping. Due dates appear on the calendar grid. |
| Trash | Soft-delete recovery — deleted notes and events go to Trash. Restore or delete permanently. |
| Settings | Language (English/Hebrew RTL), calendar mode, week start, 10 holiday toggles, 11 zmanim toggles, location, SMTP config, WhatsApp credentials |
| Offline resilience | localStorage cache for events, notes, todos, folders, message logs; "Backend offline" pill; frontend never crashes |
| Cron scheduling | Vercel Cron fires once daily at 8am (`0 8 * * *`), picks up all pending messages whose `scheduled_at` has passed |
| i18n / RTL | Full English + Hebrew translations via `useT()`. Hebrew mode switches the whole UI to RTL (sidebar flips sides, text direction reverses). |
| Mobile-responsive | Fixed bottom navigation bar on mobile (< 768 px); sidebar hidden; all pages adapt to small screens. |

---

## Docs

- Run everything locally → [running-locally.md](running-locally.md)
- Live deployment setup → [deploy.md](deploy.md)
- Turso database setup → [turso-setup.md](turso-setup.md)
- Frontend deep-dive → [frontend.md](frontend.md)
- API/backend deep-dive → [backend.md](backend.md)
- Change history → [CHANGELOG.md](CHANGELOG.md)

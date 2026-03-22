# Calendar App

A personal full-stack calendar with Hebrew/Gregorian dual-calendar support, Jewish daily prayer times (zmanim), and built-in WhatsApp & email scheduling — built for Jewish life management.

---

## What it is

A single-user web app. You get a calendar that speaks both Hebrew and Gregorian, shows Jewish holidays and the weekly parasha automatically, lets you attach scheduled WhatsApp messages or emails to any event, and displays halachic times for your location every day. The frontend is always functional — even with no backend it shows cached data and gracefully reports the connection state.

---

## Architecture

```
┌──────────────────────────┐      HTTPS       ┌────────────────────────────┐
│  Vercel (React frontend) │ ◄──────────────► │  Cloudflare Tunnel         │
│  port 443                │                  │  *.trycloudflare.com       │
└──────────────────────────┘                  └──────────┬─────────────────┘
                                                         │ localhost:8000
                                              ┌──────────▼─────────────────┐
                                              │  Docker: calendar-backend   │
                                              │  FastAPI + SQLite           │
                                              │  Named volume: calendar_db  │
                                              └────────────────────────────┘
```

- **Frontend** — React 18 + TypeScript + Vite, deployed to Vercel
- **Backend** — FastAPI (Python 3.12), runs locally inside Docker
- **Database** — SQLite persisted to a named Docker volume (`calendar_db`)
- **Tunnel** — Cloudflare Tunnel (free trycloudflare.com) exposes the local backend to the Vercel frontend over HTTPS
- **Messaging** — Meta WhatsApp Business Cloud API (Graph API v21) + async SMTP via aiosmtplib
- **Scheduling** — APScheduler runs inside the backend process, polling pending messages every 60 seconds

---

## Repository layout

```
hackathon-proj/
├── frontend/                   React app (Vite + Tailwind)
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
│   ├── Dockerfile              Multi-stage: Node builder → nginx:alpine
│   └── nginx.conf              SPA fallback + deferred-DNS proxy to backend
├── backend/                    FastAPI app
│   ├── routers/                events, whatsapp, email_router, messages, settings_router
│   ├── services/               whatsapp_service, email_service, scheduler
│   ├── models/                 SQLAlchemy ORM (Event, MessageLog)
│   ├── schemas/                Pydantic request/response schemas
│   ├── database.py             SQLAlchemy engine + pydantic-settings config
│   ├── main.py                 App factory, CORS, lifespan (DB init + scheduler)
│   ├── Dockerfile              python:3.12-slim, uvicorn on 0.0.0.0:8000
│   └── requirements.txt
├── docker-compose.yml          Runs backend + frontend together
├── RUNNING_LOCALLY.md          Step-by-step: run each part on your machine
└── DEPLOY.md                   How the live Vercel + Docker + Cloudflare setup works
```

---

## Feature summary

| Feature | Detail |
|---|---|
| Hebrew calendar | Grid starts on 1st of Hebrew month; gematriya numerals (א׳–ל׳); all months incl. leap-year Adar I/II |
| Gregorian calendar | Standard grid; switchable per-session in Settings |
| Jewish holidays | Major/minor holidays, Rosh Chodesh, Shabbat highlight, parashat hashavua, Omer count, Israeli national holidays, diaspora mode |
| Events | Create/edit/delete with title, description, time slot, 6 color options |
| Scheduled messaging | Attach a WhatsApp message and/or email to any event; pick exact send datetime |
| WhatsApp composer | Hebrew quick-templates, live WhatsApp-style chat preview, immediate or scheduled send |
| Email composer | Multi-recipient tag input, immediate or scheduled send |
| Daily Times | 11 configurable halachic times (Alot HaShachar → Tzet Shabbat) for any lat/lng/timezone |
| Settings | Calendar mode, week start, 10 holiday toggles, 11 zmanim toggles, location, SMTP config, WhatsApp credentials |
| Offline resilience | localStorage cache for events + message logs; "Backend offline" pill; frontend never crashes |

---

## Docs

- Run everything locally → [RUNNING_LOCALLY.md](RUNNING_LOCALLY.md)
- Live deployment setup → [DEPLOY.md](DEPLOY.md)
- Frontend deep-dive → [frontend/README.md](frontend/README.md)
- Backend deep-dive → [backend/README.md](backend/README.md)

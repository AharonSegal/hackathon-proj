# Calendar App

A personal Hebrew/Gregorian calendar with Jewish prayer times, event management, and WhatsApp/email scheduling.

## Docs

| File | What's inside |
|---|---|
| [docs/general.md](docs/general.md) | Full project overview, architecture, feature table, repo layout |
| [docs/frontend.md](docs/frontend.md) | Tech stack, pages, components, hooks, offline resilience, Tailwind theme |
| [docs/backend.md](docs/backend.md) | API endpoints, data models, scheduler, WhatsApp/email service setup |
| [docs/running-locally.md](docs/running-locally.md) | How to run the frontend and backend on your machine |
| [docs/deploy.md](docs/deploy.md) | Vercel + Docker + Cloudflare Tunnel deployment guide |

## Quick start

```bash
# Backend (Docker)
docker compose up backend -d

# Frontend (dev server)
cd frontend && npm install && npm run dev
```

App: http://localhost:5173 · API: http://localhost:8000/docs

# Running Locally

How to run the frontend and backend on your machine for development.

---

## Prerequisites

- **Node.js** 20+ and npm
- **Python** 3.12+ (only needed if running the backend without Docker)
- **Docker Desktop** (recommended for the backend — handles all dependencies)
- **Git**

---

## Backend

### Option A — Docker (recommended)

This is the easiest way. Docker handles Python, dependencies, and the database volume.

```bash
# From the repo root:
docker compose up backend
```

The backend starts at **http://localhost:8000**.

To rebuild after code changes:
```bash
docker compose up backend --build
```

To stop:
```bash
docker compose down
```

The SQLite database is stored in a Docker named volume (`calendar_db`) — your data survives container restarts and rebuilds.

---

### Option B — Python venv (no Docker)

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv

# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Windows (bash / Git Bash):
source .venv/Scripts/activate
# macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Open .env and fill in your credentials (see below)

# Run the server
uvicorn main:app --reload --port 8000
```

The backend starts at **http://localhost:8000** with hot-reload on code changes.

The SQLite database file is created at `backend/calendar.db` (or wherever `DATABASE_URL` points in your `.env`).

---

### Environment variables

Create `backend/.env` by copying `.env.example`:

```env
# WhatsApp — from Meta Developer dashboard
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# Email — SMTP credentials
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your_16char_app_password    # Google: Account → Security → App Passwords
EMAIL_FROM_NAME=Calendar App

# Database (leave as-is for local dev)
DATABASE_URL=sqlite:///./calendar.db

# CORS — add your frontend origin
CORS_ORIGINS=http://localhost:5173
```

**WhatsApp + email credentials are optional.** The backend starts and works fine without them — you just can't send messages until they're filled in. Use the test buttons in the Settings page to verify once you add them.

---

### Verify the backend is running

```bash
curl http://localhost:8000/api/health
# → {"status":"ok"}
```

Or open **http://localhost:8000/docs** in your browser for the interactive Swagger UI.

---

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at **http://localhost:5173**.

Vite automatically proxies any request to `/api/*` to `http://localhost:8000`, so you don't need to set any environment variables for local development.

---

### What to expect

- If the backend is running: the app connects and loads real data.
- If the backend is **not** running: you'll see the "Backend offline — showing cached data" pill in the bottom-right corner. The app still works with any data cached from previous sessions.

---

## Running both at once (Docker Compose)

To run the backend **and** a production-built frontend together in Docker:

```bash
# From the repo root:
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend (nginx) | http://localhost:3000 |
| Backend (FastAPI) | http://localhost:8000 |

> Note: The Docker frontend serves the production build. For development with hot-reload, run the frontend with `npm run dev` separately and the backend with `docker compose up backend`.

---

## Useful commands

```bash
# View backend logs
docker compose logs -f backend

# Open a shell inside the backend container
docker exec -it calendar-backend bash

# Inspect the SQLite database
docker exec -it calendar-backend sqlite3 /app/data/calendar.db ".tables"

# Rebuild only the frontend Docker image
docker compose build frontend

# Remove all containers and the database volume (wipes all data)
docker compose down -v
```

---

## Common issues

**`ModuleNotFoundError` when running uvicorn** — make sure your venv is activated before running `pip install` and `uvicorn`.

**Port 8000 already in use** — another process is using the port. Either stop it or change the port: `uvicorn main:app --port 8001` (and update `CORS_ORIGINS` + the Vite proxy target accordingly).

**`CORS` errors in the browser** — your frontend origin isn't in the `CORS_ORIGINS` env var. Add it (comma-separated) and restart the backend.

**Calendar shows nothing / empty grid** — the layout needs the backend to be reachable at least once to populate the cache. If you just started everything, give it a few seconds and refresh.

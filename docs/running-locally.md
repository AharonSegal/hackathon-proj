# Running Locally

How to run the app on your machine for development. No Docker, no Python — just Node.js and the Vercel CLI.

---

## Prerequisites

- **Node.js** 20+ and npm
- **Vercel CLI** — `npm i -g vercel`
- **Git**
- A **Turso** database (free tier) — [turso.tech](https://turso.tech)

---

## 1. Clone and install

```bash
git clone https://github.com/your-username/hackathon-proj.git
cd hackathon-proj/frontend
npm install
```

---

## 2. Set up Turso

1. Sign up at [turso.tech](https://turso.tech).
2. Create a database: `turso db create calendar-app`
3. Get the URL: `turso db show calendar-app --url`
4. Generate a token: `turso db tokens create calendar-app`

---

## 3. Create your local env file

In the `frontend/` directory, create a `.env` file (do **not** commit this):

```env
# Turso
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# WhatsApp (optional — only needed to test sending)
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token

# Email / SMTP (optional — only needed to test sending)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your-16-char-app-password
EMAIL_FROM_NAME=Calendar App

# Cron secret (any random string)
CRON_SECRET=dev-secret
```

See `.env.example` in the repo root for a template.

---

## 4. Run with Vercel Dev

```bash
cd frontend
vercel dev
```

`vercel dev` serves both the React frontend **and** the API routes (`frontend/api/`) on a single port (usually **http://localhost:3000**). This matches production exactly — no separate server needed.

> **Why not `npm run dev`?** `vite dev` only serves the React bundle; it doesn't execute the TypeScript API routes. `vercel dev` emulates the full Vercel environment locally.

---

## 5. Verify it's working

```bash
curl http://localhost:3000/api/health
# → {"status":"ok"}
```

Then open **http://localhost:3000** in your browser. The app should connect immediately and the "Backend offline" pill should not appear.

---

## What to expect

- If Turso is connected: the app loads real data.
- If Turso is unreachable or env vars are missing: API calls return 500 and the frontend falls back to localStorage cache, showing the "Backend offline" pill.

---

## Common issues

**`vercel dev` command not found** — install the CLI: `npm i -g vercel`, then run `vercel login`.

**`TURSO_DATABASE_URL env var is not set`** — make sure you created `frontend/.env` (not `.env` at the repo root). `vercel dev` loads `.env` from the project root it's run in.

**API routes return 500** — check the `vercel dev` terminal output for the actual error. Most common: missing env vars or a Turso auth error.

**Calendar shows nothing** — open the browser console. If you see a `401` or `500` from `/api/events`, the Turso credentials are wrong. Fix the `.env` and restart `vercel dev`.

**WhatsApp / email sends fail in test** — credentials might be missing or wrong. Use the test buttons in Settings → they show the exact error from the API.

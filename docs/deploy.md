# Deployment

How the live version works: **Vercel** hosts both the React SPA and the TypeScript API routes. **Turso** provides the cloud SQLite database. No Docker, no local server, no tunnel required.

---

## Architecture

```
User's browser
      │  HTTPS
      ▼
┌──────────────────────────────────────┐
│  Vercel                               │
│  ├── React SPA (CDN-cached)           │
│  └── API routes (serverless fns)      │
│      /api/health                      │
│      /api/ping                        │
│      /api/debug                       │
│      /api/events                      │
│      /api/messages/*                  │
│      /api/cron/send-messages          │
└───────────────┬──────────────────────┘
                │  libsql over HTTPS
                ▼
┌──────────────────────────────────────┐
│  Turso                                │
│  cloud SQLite — always on             │
│  tables: events, message_logs         │
└──────────────────────────────────────┘
```

---

## One-time setup

### 1. Create the Turso database

See [turso-setup.md](turso-setup.md) for the full step-by-step guide.

Short version:
```bash
turso db create calendar-app
turso db show calendar-app --url      # → your TURSO_DATABASE_URL
turso db tokens create calendar-app   # → your TURSO_AUTH_TOKEN
```

The tables (`events`, `message_logs`) are created automatically on first API call via `ensureInit()` in `lib/db.ts`.

---

### 2. Deploy to Vercel

1. Push the repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Configure the project settings:

| Setting | Value |
|---|---|
| **Root Directory** | `./` (repo root — leave blank) |
| **Framework Preset** | Other |
| **Install Command** | `npm install && cd frontend && npm install` |
| **Build Command** | `cd frontend && npm run build` |
| **Output Directory** | `frontend/dist` |

4. Click **Deploy**.

> **Important**: The `api/` and `lib/` folders are at the repo root. Setting the root directory to `frontend/` would prevent Vercel from finding them. Keep it as `./`.

---

### 3. Add environment variables

In your Vercel project → **Settings** → **Environment Variables**, add all of these:

| Variable | Where to get it |
|---|---|
| `TURSO_DATABASE_URL` | `turso db show calendar-app --url` |
| `TURSO_AUTH_TOKEN` | `turso db tokens create calendar-app` |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Developer dashboard → WhatsApp → API Setup |
| `WHATSAPP_ACCESS_TOKEN` | Meta Developer dashboard → generate permanent token |
| `SMTP_HOST` | Your SMTP provider (default: `smtp.gmail.com`) |
| `SMTP_PORT` | `587` (STARTTLS) or `465` (TLS) |
| `SMTP_USER` | Your email address |
| `SMTP_PASSWORD` | Gmail: App Password (16 chars, not your login password) |
| `EMAIL_FROM_NAME` | Sender display name, e.g. `Calendar App` |
| `CRON_SECRET` | Any random string — used to authenticate Vercel Cron calls |

See `.env.example` at the repo root for a copy-paste template.

After adding env vars, trigger a redeploy: **Deployments** → three-dot menu on the latest → **Redeploy**.

---

### 4. Verify the deployment

```bash
curl https://your-app.vercel.app/api/ping
# → {"pong":true}

curl https://your-app.vercel.app/api/health
# → {"status":"ok","db":"ok","latencyMs":N}

curl https://your-app.vercel.app/api/debug
# → full diagnostic JSON with env var status + DB connection info
```

Open the app in your browser — the "Backend offline" pill should not appear and the Dashboard should show "Database — connected".

---

## Updating the app

Any push to `main` triggers an automatic Vercel deployment. No manual steps needed.

```bash
git add . && git commit -m "your message" && git push
```

---

## Scheduled messages (Cron)

Vercel Cron fires `GET /api/cron/send-messages` once daily at 8am UTC (`0 8 * * *`). The handler:

1. Queries all `message_logs` rows where `status = 'pending'` and `scheduled_at <= now`.
2. Sends each message (WhatsApp or email).
3. Updates the row status to `sent` or `failed`.

The cron is configured in `vercel.json` at the repo root:
```json
{
  "crons": [{ "path": "/api/cron/send-messages", "schedule": "0 8 * * *" }]
}
```

> **Vercel Hobby plan limitation**: only **daily** cron jobs are allowed. Hourly (`0 * * * *`) or more frequent schedules require the Pro plan and will silently block all new deployments if used on Hobby. Keep the schedule to once per day.

You can monitor cron invocations in the Vercel dashboard under **Cron Jobs**.

---

## Data persistence

All data lives in Turso. It is:
- **Always-on** — no container to restart, no tunnel to keep alive
- **Persistent** — data survives new Vercel deployments
- **Backed up** — Turso handles replication internally

To export your data:
```bash
turso db shell calendar-app ".dump" > backup.sql
```

---

## Troubleshooting

**"Backend offline" shows after deploy**
- Check that all env vars were added and a redeploy was triggered after adding them.
- Visit `/api/debug` on your live domain — it shows which env vars are set and the exact DB error.
- Check Vercel → Functions logs for the actual error.

**New push didn't trigger a deployment / stuck on old commit**
- Check if the Vercel build failed. A common cause: using an hourly cron schedule (`0 * * * *`) on a Hobby account — it blocks the deployment. Keep the schedule daily.
- Check Vercel → Deployments for any failed builds and their error logs.

**API returns 500 with "TURSO_DATABASE_URL env var is not set"**
- The env var wasn't saved properly. Re-add it in Vercel → Settings → Environment Variables, then redeploy.

**Messages aren't being sent on schedule**
- Verify `CRON_SECRET` is set in Vercel.
- Check Vercel dashboard → Cron Jobs → see if the job ran and what it returned.
- Check Functions logs for the `/api/cron/send-messages` invocation.

**WhatsApp messages fail**
- The phone number must be registered as a test number in the Meta developer dashboard (unless you have a verified business).
- Check that `WHATSAPP_ACCESS_TOKEN` hasn't expired (use a permanent token, not a temporary one).

**Email fails with "Invalid login"**
- Gmail requires a 16-character App Password, not your regular password.
- Make sure 2FA is enabled on the Google account first.

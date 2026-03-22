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

1. Sign up at [turso.tech](https://turso.tech).
2. Create a database:
   ```bash
   turso db create calendar-app
   ```
3. Get the URL:
   ```bash
   turso db show calendar-app --url
   # → libsql://calendar-app-<org>.turso.io
   ```
4. Generate an auth token:
   ```bash
   turso db tokens create calendar-app
   ```
5. Save both values — you'll need them in step 3.

The tables (`events`, `message_logs`) are created automatically on first API call via `ensureInit()` in `lib/db.ts`.

---

### 2. Deploy to Vercel

1. Push the repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Configure the project:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist`
4. Click **Deploy**.

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
curl https://your-app.vercel.app/api/health
# → {"status":"ok"}
```

Open the app in your browser — the "Backend offline" pill should not appear.

---

## Updating the app

Any push to `main` triggers an automatic Vercel deployment. No manual steps needed.

```bash
git add . && git commit -m "your message" && git push
```

---

## Scheduled messages (Cron)

Vercel Cron fires `GET /api/cron/send-messages` every hour (`0 * * * *`). The handler:

1. Queries all `message_logs` rows where `status = 'pending'` and `scheduled_at <= now`.
2. Sends each message (WhatsApp or email).
3. Updates the row status to `sent` or `failed`.

The cron is configured in `frontend/vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/send-messages", "schedule": "0 * * * *" }]
}
```

Vercel Cron is available on all plans (including free Hobby). You can monitor invocations in the Vercel dashboard under **Cron Jobs**.

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
- Open browser DevTools → Network tab → look for failed `/api/health` calls.
- Check Vercel → Functions logs for the actual error.

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

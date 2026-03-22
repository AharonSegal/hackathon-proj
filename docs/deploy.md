# Deployment

How the live version of this app works: Vercel (frontend) + Docker on your local machine (backend) + Cloudflare Tunnel to bridge them.

---

## Architecture overview

```
User's browser
      │  HTTPS
      ▼
┌─────────────────────────┐
│  Vercel                  │   Static React build
│  calendar-app.vercel.app │   served by Vercel's CDN
└────────────┬────────────┘
             │  HTTPS  (VITE_API_URL points here)
             ▼
┌─────────────────────────────────────────┐
│  Cloudflare Tunnel                       │
│  https://xyz.trycloudflare.com           │
│  (free, no account needed)               │
└────────────┬────────────────────────────┘
             │  localhost:8000
             ▼
┌─────────────────────────────────────────┐
│  Your PC — Docker                        │
│  container: calendar-backend             │
│  FastAPI + SQLite                         │
│  volume: calendar_db → /app/data         │
└─────────────────────────────────────────┘
```

The backend runs **on your local machine** in Docker and is exposed to the internet via a free Cloudflare Tunnel. The frontend is deployed to Vercel and talks to the backend through the tunnel URL.

---

## One-time setup

### 1. Deploy the frontend to Vercel

1. Push the repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the GitHub repo.
3. Configure the project:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default — type it exactly, no spaces)
4. Add an environment variable:
   - Key: `VITE_API_URL`
   - Value: *(leave blank for now — fill in after step 3)*
5. Click **Deploy**.

The frontend will build and deploy. Since `VITE_API_URL` is empty the app will show "Backend offline" — that's expected until the tunnel is running.

---

### 2. Run the backend in Docker

```bash
# From the repo root:
docker compose up backend -d
```

This starts the backend on `localhost:8000` with data persisted to the `calendar_db` Docker volume.

Verify it's running:
```bash
curl http://localhost:8000/api/health
# → {"status":"ok"}
```

---

### 3. Start the Cloudflare Tunnel

Download `cloudflared` once:

```bash
# Windows — download the binary directly:
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe -o cloudflared.exe
```

Then start the tunnel:

```bash
./cloudflared.exe tunnel --url http://localhost:8000
```

After a few seconds you'll see a line like:
```
Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):
https://madrid-sheet-listings-blind.trycloudflare.com
```

Copy that URL.

---

### 4. Set the tunnel URL in Vercel

1. Go to your Vercel project → **Settings** → **Environment Variables**.
2. Find `VITE_API_URL` and update the value to your tunnel URL, e.g.:
   ```
   https://madrid-sheet-listings-blind.trycloudflare.com
   ```
   No trailing slash.
3. Go to **Deployments** → click the three-dot menu on the latest deployment → **Redeploy**.

Once the redeploy finishes, the frontend will connect to your local backend through the tunnel and the "Backend offline" pill will disappear.

---

## Keeping it running

### Every time you restart your PC

You need to restart both the Docker container and the Cloudflare Tunnel. The tunnel generates a **new URL each time**, so you also need to update Vercel.

Quick restart sequence:

```bash
# 1. Start the backend
docker compose up backend -d

# 2. Start the tunnel (keep this terminal open)
./cloudflared.exe tunnel --url http://localhost:8000
# → copy the new *.trycloudflare.com URL

# 3. Update Vercel env var VITE_API_URL → new URL → Redeploy
```

### Keep the terminal open

The tunnel stays alive as long as the `cloudflared` process is running. If you close the terminal, the tunnel dies and the frontend loses connection to the backend.

---

## Backend environment variables

The backend reads from `backend/.env`. Make sure this file exists before running Docker:

```env
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your_app_password

DATABASE_URL=sqlite:///./data/calendar.db
CORS_ORIGINS=https://your-app.vercel.app,http://localhost:5173
```

**Important**: Add your Vercel app URL to `CORS_ORIGINS`. Without it, the browser will block API requests due to CORS.

After editing `.env`, restart the backend container:
```bash
docker compose restart backend
```

---

## Data persistence

The SQLite database lives in a Docker **named volume** called `calendar_db`, mounted at `/app/data/calendar.db` inside the container.

Named volumes survive:
- `docker compose down` (containers removed)
- `docker compose up --build` (image rebuilt)

Named volumes do NOT survive:
- `docker compose down -v` (the `-v` flag deletes volumes — **this wipes all data**)

To back up the database:
```bash
docker cp calendar-backend:/app/data/calendar.db ./calendar_backup.db
```

To restore:
```bash
docker cp ./calendar_backup.db calendar-backend:/app/data/calendar.db
```

---

## Updating the app

### Frontend changes

```bash
git add . && git commit -m "your message" && git push
```

Vercel auto-deploys on every push to `main`. No manual action needed.

### Backend changes

```bash
docker compose up backend --build -d
```

This rebuilds the backend image and restarts the container. Data in the volume is untouched.

---

## Limitations of this setup

| Limitation | Reason | Fix (if needed) |
|---|---|---|
| Backend must be running on your PC | No cloud hosting | Deploy backend to Railway, Render, or a VPS |
| Tunnel URL changes on every restart | Free trycloudflare.com doesn't offer persistent URLs | Get a paid Cloudflare Tunnel with a custom domain, or use ngrok with a static subdomain |
| Requires manual Vercel redeploy after tunnel restart | `VITE_API_URL` is baked in at build time | Use a persistent tunnel URL to avoid this |
| No HTTPS on the backend directly | Traffic goes through the tunnel | The tunnel provides HTTPS termination; the backend itself only needs HTTP |

---

## Troubleshooting

**"Backend offline" still shows after redeploying**
- Confirm the tunnel is running: open the tunnel URL in your browser directly → should return `{"status":"ok"}`.
- Check `VITE_API_URL` in Vercel has no trailing slash.
- Make sure the redeploy completed (not just "queued").

**CORS error in the browser console**
- The Vercel URL isn't in `CORS_ORIGINS` in `backend/.env`.
- Add it and run `docker compose restart backend`.

**Tunnel URL works in browser but 502 in the app**
- The backend container may have crashed. Check: `docker compose logs backend`.
- Restart: `docker compose restart backend`.

**Events disappear after restarting Docker**
- You ran `docker compose down -v` which deletes the volume. Always use `docker compose down` (without `-v`) to preserve data.

# Sending Integration Plan — WhatsApp & Email
### Based on: WhatsappAndEmail-main docs + existing project audit

---

## 1. What WhatsappAndEmail-main Actually Is

The folder is a **3-layer sending stack**, not just a simple API wrapper:

```
Our App  →  Express/Vercel API  →  n8n webhook  →  Evolution API  →  WhatsApp phone
                                               ↘  Gmail node     →  Email inbox
```

| Layer | Tool | Role |
|---|---|---|
| Layer 1 — Bridge | Express server (or our Vercel API) | Validates input, converts datetime to ISO, forwards to n8n |
| Layer 2 — Automation | **n8n** (Docker, port 5678) | Receives the webhook, schedules it, routes to the right channel |
| Layer 3 — WhatsApp sender | **Evolution API** (Docker, port 8080) | Connects to a real WhatsApp account via QR scan, sends messages |
| Layer 3 — Email sender | **n8n Gmail node** | n8n sends email directly via its built-in Gmail integration |

### Why Evolution API instead of Meta Business API?
The current `lib/whatsapp.ts` uses Meta Graph API v21 which requires an **approved WhatsApp Business Platform account** (paid, takes time to get approved).

Evolution API connects via **WhatsApp Web** (QR code scan) — works with any regular WhatsApp number immediately, no Meta approval needed.

---

## 2. The Infrastructure Stack (Docker Compose)

Four containers run together:

| Container | Port | Purpose |
|---|---|---|
| `evolution_api` | 8080 | WhatsApp sender — scans QR to connect a phone |
| `n8n_automation` | 5678 | Automation engine — receives webhooks, schedules sends |
| `postgres` | 5432 | Stores Evolution API data + n8n workflow state |
| `redis` | 6379 | Fast queue / session cache for Evolution API |

**Required before starting:**
```bash
docker network create dokploy-network
docker-compose up -d
docker logs -f evolution_api   # scan the QR code to connect WhatsApp
```

**Environment variables needed (`.env`):**
```env
POSTGRES_DATABASE=evolution
POSTGRES_USERNAME=root
POSTGRES_PASSWORD=your_secure_password
AUTHENTICATION_API_KEY=your_evolution_api_key
```

**n8n is at:** `http://localhost:5678`
**Evolution API is at:** `http://localhost:8080`

---

## 3. The Payload Format

The n8n webhook expects this unified payload (one call covers both channels):
```json
{
  "email": "user@example.com",
  "message": "Hello, this is a scheduled notification!",
  "sendEmail": true,
  "sendWhatsApp": true,
  "phone": "972501234567",
  "subject": "Event Reminder",
  "scheduledTime": "2026-03-27T14:30:00.000Z"
}
```

- `sendEmail` and `sendWhatsApp` are booleans — one payload can trigger both
- `scheduledTime` is ISO format — n8n handles the delay internally
- `phone` without `+` prefix (Evolution API format, unlike Meta's E.164)

---

## 4. What Exists in Our Project vs What Changes

### What stays the same
| File | Status |
|---|---|
| `lib/email.ts` | Keep as SMTP fallback — can be called directly if n8n is unavailable |
| `frontend/` — all composers, log panel, MessagesPage | Keep entirely — no frontend changes needed for the core integration |
| `lib/db.ts` — `message_logs` table | Keep — still log every send attempt |
| `vercel.json` cron | Keep — still needed for fallback/polling |

### What changes on the backend

#### `lib/whatsapp.ts` → REPLACE with Evolution API caller
```ts
// New: lib/whatsapp.ts
// Instead of Meta Graph API, calls Evolution API
POST http://localhost:8080/message/sendText/{instanceName}
Headers: { apikey: EVOLUTION_API_KEY }
Body: { number: "9725xxxxxxx", textMessage: { text: "..." } }
```

#### `lib/n8n.ts` → NEW file
Unified sender that posts to the n8n webhook:
```ts
export async function sendViaN8n(payload: N8nPayload): Promise<void>
// POSTs to N8N_WEBHOOK_URL with the unified payload
// This replaces BOTH sendWhatsApp() and sendEmail() calls
```

#### `api/messages/[...path].ts` → UPDATE
- WhatsApp route: call `sendViaN8n()` instead of `sendWhatsApp()`
- Email route: call `sendViaN8n()` instead of `sendEmail()`
- Add new route: `POST /api/messages/notify` — unified channel endpoint (sends to both channels in one request)
- Add new route: `DELETE /api/messages/logs/:id` — cancel a pending scheduled message

#### `vercel.json` → UPDATE cron schedule
```json
"schedule": "*/15 * * * *"   // every 15 min instead of daily 8 AM
```

---

## 5. New File: `lib/n8n.ts`

```ts
interface N8nPayload {
  email?: string;
  message: string;
  sendEmail: boolean;
  sendWhatsApp: boolean;
  phone?: string;
  subject?: string;
  scheduledTime?: string;   // ISO — omit for immediate send
}

export async function sendViaN8n(payload: N8nPayload): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  // POSTs payload to n8n, n8n routes to Evolution API / Gmail
}
```

**New environment variable:**
```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook/send-message
# In production: https://your-n8n-host/webhook/send-message
```

---

## 6. New API Endpoint: `POST /api/messages/notify`

Inspired by the WhatsappAndEmail-main `N8nPayload` — one request, both channels:
```ts
// Request body
{
  message: string,
  scheduleAt?: string,        // ISO — omit to send now
  eventId?: string,
  channels: {
    whatsapp?: { to: string },
    email?: { to: string[], subject: string }
  }
}
```
Creates a `message_log` entry per channel, then calls `sendViaN8n()`.

---

## 7. New API Endpoint: `DELETE /api/messages/logs/:id`

Cancel a scheduled (pending) message before it fires:
- Only cancels if `status = 'pending'`
- Sets status to `'cancelled'`
- Frontend: add ✕ button in `MessageLogPanel` for pending entries

---

## 8. Frontend Changes

The existing MessagesPage composers are complete — minimal changes needed:

| File | Change |
|---|---|
| `MessagesPage.tsx` | Add `QuickNotifyPanel` as a new tab — one form for both channels at once |
| `components/QuickNotifyPanel.tsx` | **New** — channel checkboxes (WA + email), shared message, schedule picker, submit → `POST /api/messages/notify` |
| `components/MessageLogPanel.tsx` | Add ✕ cancel button for `status = 'pending'` entries |
| `pages/Calendar/` — event modal | Add "Notifications" section: WA toggle (phone + when) + email toggle (recipients + when) |
| `shared/types/event.types.ts` | Add `'cancelled'` to `MessageLog.status`, add `NotifyPayload` type |
| `shared/hooks/useApi.ts` | Add `messageApi.notify(payload)`, `messageApi.cancel(id)` |
| `shared/i18n/translations.ts` | Add all new strings (EN + HE) |

---

## 9. n8n Workflow Setup (Manual Step)

After Docker is running, inside n8n (`localhost:5678`):
1. Create a new Workflow
2. Add **Webhook** trigger node → URL: `/webhook/send-message`
3. Add **IF** node: `sendWhatsApp == true` → connect to Evolution API HTTP node
4. Add **IF** node: `sendEmail == true` → connect to Gmail node
5. For scheduled sends: add **Wait** node before the send nodes using `scheduledTime`
6. Save and activate the workflow

**Evolution API HTTP node config:**
- URL: `http://evolution_api:8080/message/sendText/{{ instanceName }}`
- Header: `apikey: YOUR_EVOLUTION_API_KEY`
- Body: `{ "number": "{{ phone }}", "textMessage": { "text": "{{ message }}" } }`

---

## 10. Environment Variables Summary

| Variable | Where Set | Purpose |
|---|---|---|
| `N8N_WEBHOOK_URL` | Vercel env + `.env.local` | n8n webhook endpoint |
| `EVOLUTION_API_KEY` | Docker `.env` | Evolution API authentication |
| `POSTGRES_*` | Docker `.env` | Evolution API + n8n database |
| `SMTP_*` | Vercel env (existing) | Fallback direct email if n8n is down |
| `WHATSAPP_*` | Vercel env (existing) | Keep for now — remove after Evolution API confirmed working |
| `CRON_SECRET` | Vercel env (existing) | Protects cron endpoint |

---

## 11. Implementation Order

| # | Task | Files |
|---|---|---|
| 1 | Docker Compose + QR scan (infrastructure, manual) | `docker-compose.yml` (new), `.env` |
| 2 | Build n8n workflow (manual, in n8n UI) | — |
| 3 | `lib/n8n.ts` — unified n8n sender | New file |
| 4 | `api/messages/[...path].ts` — swap senders, add `notify` + `cancel` routes | Existing file |
| 5 | `vercel.json` — fix cron to every 15 min | Existing file |
| 6 | Types + API client additions | `event.types.ts`, `useApi.ts` |
| 7 | `QuickNotifyPanel` component | New file |
| 8 | `MessageLogPanel` cancel button | Existing file |
| 9 | Event modal — Notifications section | Existing file |
| 10 | Translations | `translations.ts` |
| 11 | Delete `WhatsappAndEmail-main/` folder | — |

---

## 12. Development vs Production

| | Development | Production |
|---|---|---|
| Evolution API | Docker on local machine (`localhost:8080`) | VPS / cloud VM with Docker |
| n8n | Docker on local machine (`localhost:5678`) | n8n Cloud or same VPS |
| n8n webhook URL | `http://localhost:5678/webhook/send-message` | `https://your-n8n.domain.com/webhook/send-message` |
| Our app | `localhost:5173` (Vite dev) | Vercel |
| DB (our app) | Turso (already remote) | Turso (same) |

> **Note:** For production the n8n + Evolution API stack must be on a server with a public URL (not Vercel, since those are serverless). A small VPS (e.g. 2GB RAM) running Docker Compose is sufficient.

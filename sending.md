# Sending Integration Plan — WhatsApp & Email
### Vercel-native, no Docker, no separate server

---

## TL;DR

| Channel | Solution | How it works |
|---|---|---|
| WhatsApp | **UltraMsg** (cloud) | Scan QR once on their dashboard → they host the connection → you call their HTTP API |
| Email | **Resend** (cloud) | Sign up → get API key → one HTTP call to send |
| Scheduling | Existing **Vercel cron** (every 15 min) | Already built, just fix the schedule |
| Infrastructure | **None** | Zero Docker, zero separate server, everything stays on Vercel |

---

## Why Not Docker / n8n / Evolution API?

Evolution API requires a **persistent WebSocket connection** to WhatsApp Web — it must run 24/7 on a server.
Vercel functions are **stateless and short-lived** — they spin up per request and die after ~30 seconds.

The solution: use cloud services that host that persistent connection FOR you.
You just call their HTTP API — exactly like calling any other REST API from Vercel.

---

## 1. WhatsApp — UltraMsg

**What it is:** A hosted Evolution API. They run the WhatsApp Web connection on their servers. You scan a QR code once on their dashboard and get an API key.

**Why UltraMsg over alternatives:**

| Service | Needs Meta approval | QR scan (any number) | Vercel compatible | Price |
|---|---|---|---|---|
| **UltraMsg** | ✅ No | ✅ Yes | ✅ Yes | ~$15/mo or free trial |
| Meta Graph API (current) | ❌ Yes (takes weeks) | ❌ No (business account only) | ✅ Yes | Pay per message |
| Twilio WhatsApp | ❌ Yes (Meta partner) | ❌ No | ✅ Yes | ~$0.005/msg + number |
| Evolution API (Docker) | ✅ No | ✅ Yes | ❌ No (needs server) | Free (self-host) |

**Setup (5 minutes):**
1. Sign up at ultramsg.com
2. Create an instance
3. Scan QR with your WhatsApp phone
4. Copy `instanceId` and `token` → add to Vercel environment variables

**API call (replaces `lib/whatsapp.ts`):**
```
POST https://api.ultramsg.com/{instanceId}/messages/chat
Body: { token, to: "972501234567", body: "Hello!" }
```

---

## 2. Email — Resend

**What it is:** A modern email API. Sign up, verify a sending domain (or use their sandbox), get an API key.

**Why Resend over keeping SMTP:**
- SMTP on Vercel can time out on cold starts
- Resend is a single HTTP call — faster, more reliable, simpler
- Free tier: 3,000 emails/month, 100/day
- If you prefer to keep SMTP (Nodemailer already in `lib/email.ts`) — that works too, no change needed

**Setup:**
1. Sign up at resend.com
2. Add and verify your sending domain (or use `onboarding@resend.dev` for testing)
3. Copy API key → add to Vercel env vars

**API call (replaces `lib/email.ts`):**
```
POST https://api.resend.com/emails
Headers: { Authorization: Bearer RESEND_API_KEY }
Body: { from, to[], subject, text }
```

---

## 3. What the New Architecture Looks Like

```
User action (frontend)
        ↓
POST /api/messages/whatsapp  or  POST /api/messages/email
        ↓
Saved to message_logs (status: pending or sent)
        ↓ (if scheduleAt is set — wait for cron)
Vercel Cron (every 15 min) → GET /api/messages/cron
        ↓
lib/whatsapp.ts  →  UltraMsg HTTP API  →  WhatsApp phone ✅
lib/email.ts     →  Resend HTTP API    →  Email inbox ✅
```

No n8n. No Docker. No separate server. Everything is already in the existing project structure — we just swap the sender libraries.

---

## 4. Exact Code Changes

### `lib/whatsapp.ts` — replace Meta API with UltraMsg

```ts
export async function sendWhatsApp(to: string, message: string): Promise<void> {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token      = process.env.ULTRAMSG_TOKEN;

  if (!instanceId || !token) {
    throw new Error('UltraMsg credentials not configured');
  }

  // UltraMsg expects number without + (e.g. "972501234567")
  const normalizedTo = to.startsWith('+') ? to.slice(1) : to;

  const res = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token, to: normalizedTo, body: message }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`UltraMsg error ${res.status}: ${text}`);
  }
}
```

### `lib/email.ts` — replace Nodemailer with Resend

```ts
export async function sendEmail(to: string[], subject: string, body: string): Promise<void> {
  const apiKey   = process.env.RESEND_API_KEY;
  const fromName = process.env.EMAIL_FROM_NAME ?? 'Calendar App';
  const fromAddr = process.env.EMAIL_FROM_ADDRESS ?? 'noreply@yourdomain.com';

  if (!apiKey) throw new Error('RESEND_API_KEY not configured');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: `${fromName} <${fromAddr}>`, to, subject, text: body }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error ${res.status}: ${text}`);
  }
}
```

> **Note:** If you prefer to keep Nodemailer SMTP (`lib/email.ts` already works on Vercel) — skip this change entirely. Only swap to Resend if SMTP causes issues.

### `vercel.json` — fix cron frequency

```json
{
  "crons": [
    {
      "path": "/api/messages/cron",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

### `api/messages/[...path].ts` — add `notify` + `cancel` routes
Two new routes in the existing file — no structural changes:

**`POST /api/messages/notify`** — one request fires both channels:
```ts
// Body: { message, scheduleAt?, eventId?, channels: { whatsapp?: {to}, email?: {to[], subject} } }
// Creates one message_log per channel, calls send or schedules via cron
```

**`DELETE /api/messages/logs/:id`** — cancel a pending message:
```ts
// Sets status = 'cancelled' if status is currently 'pending'
```

---

## 5. New Environment Variables

| Variable | Service | Value example |
|---|---|---|
| `ULTRAMSG_INSTANCE_ID` | UltraMsg | `instance12345` |
| `ULTRAMSG_TOKEN` | UltraMsg | `abc123xyz` |
| `RESEND_API_KEY` | Resend | `re_xxxxxxxx` |
| `EMAIL_FROM_ADDRESS` | Resend | `app@yourdomain.com` |

**Remove after migration:**
- `WHATSAPP_PHONE_NUMBER_ID` — no longer needed
- `WHATSAPP_ACCESS_TOKEN` — no longer needed

**Keep:**
- `SMTP_*` — keep as fallback if staying with Nodemailer
- `CRON_SECRET` — keep for cron security

---

## 6. Frontend Changes

The existing MessagesPage, composers, and log panel are all complete.
These additions remain the same as before:

| File | Change |
|---|---|
| `components/QuickNotifyPanel.tsx` | **New** — channel checkboxes + shared message + schedule picker → `POST /api/messages/notify` |
| `components/MessageLogPanel.tsx` | Add ✕ cancel button for `pending` entries |
| `pages/Calendar/` event modal | Add "Notifications" section (WA toggle + email toggle + when) |
| `shared/types/event.types.ts` | Add `'cancelled'` to status union, add `NotifyPayload` type |
| `shared/hooks/useApi.ts` | Add `messageApi.notify()`, `messageApi.cancel()` |
| `shared/i18n/translations.ts` | New strings EN + HE |

---

## 7. Implementation Order

| # | Task | Effort |
|---|---|---|
| 1 | Sign up UltraMsg + scan QR (manual, 5 min) | Setup only |
| 2 | Sign up Resend + verify domain (manual, 5 min) | Setup only |
| 3 | Add env vars to Vercel dashboard | Setup only |
| 4 | Rewrite `lib/whatsapp.ts` → UltraMsg | ~15 min |
| 5 | Rewrite `lib/email.ts` → Resend (optional) | ~15 min |
| 6 | Fix `vercel.json` cron to `*/15 * * * *` | 1 line |
| 7 | Add `notify` + `cancel` routes to `api/messages/[...path].ts` | ~45 min |
| 8 | Add types + API client methods | ~20 min |
| 9 | `QuickNotifyPanel` component | ~45 min |
| 10 | `MessageLogPanel` cancel button | ~15 min |
| 11 | Event modal Notifications section | ~1 hr |
| 12 | Translations | ~20 min |
| 13 | Delete `WhatsappAndEmail-main/` + `New Compressed (zipped) Folder/` | Done |

---

## 8. What We're Keeping from WhatsappAndEmail-main

| Concept | How we use it |
|---|---|
| Single payload for both channels (`sendEmail` + `sendWhatsApp` booleans) | The new `POST /api/messages/notify` endpoint |
| "Must select at least one channel" validation | In `QuickNotifyPanel` and the `notify` route |
| Phone number format without `+` | UltraMsg expects `972501234567` not `+972501234567` |
| Datetime → ISO conversion pattern | Already handled by `datetime-local` HTML input |

**Not needed:** n8n, Docker, Express server, Evolution API, Postgres (Docker), Redis — all replaced by cloud APIs.

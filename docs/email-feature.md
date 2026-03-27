# Email Feature

---

## What It Is

The email feature lets users compose and send emails directly from the app — either **immediately** or **scheduled for a future time**. Every send attempt is logged to the database with a status (`pending`, `sent`, `failed`) so the user can see what was sent, what is queued, and what failed.

It is built entirely on Vercel serverless functions + Nodemailer (SMTP). No third-party email service required — it works with any standard email provider (Gmail, Outlook, custom SMTP).

---

## How It Works — Full Flow

```
User fills EmailComposer (frontend)
         │
         ▼
POST /api/messages/email
{ to: ["a@b.com"], subject: "...", body: "...", scheduleAt?: "ISO" }
         │
         ▼
api/messages/[...path].ts
  1. Validates: to[] is non-empty array, all valid emails, subject + body present
  2. Inserts row into message_logs  (status = 'pending')
  3. Was scheduleAt provided?
         │
    NO ──┤──► calls sendEmail() immediately
         │         │
         │    SUCCESS ──► UPDATE message_logs SET status='sent', sent_at=now
         │    FAILURE ──► UPDATE message_logs SET status='failed', error=msg
         │
   YES ──┘──► leaves row as 'pending' — cron will pick it up
         │
         ▼
Returns the message_log row to frontend
         │
         ▼
MessageLogPanel refreshes and shows the new entry
```

### For scheduled messages — the cron job

```
Vercel Cron fires GET /api/messages/cron  (once daily at 8 AM UTC — Hobby plan limit)
         │
         ▼
SELECT * FROM message_logs
WHERE status = 'pending' AND scheduled_at <= now()
ORDER BY scheduled_at ASC
         │
         ▼
For each pending row where type = 'email':
  calls sendEmail(recipients[], subject, body)
         │
  SUCCESS ──► UPDATE status='sent',  sent_at=now
  FAILURE ──► UPDATE status='failed', error=message
         │
         ▼
Returns { processed: N, results: [...] }
```

---

## The Sending Function — `lib/email.ts`

Nodemailer SMTP wrapper. Reads all credentials from **Vercel environment variables** at send time.

```
SMTP_HOST      → the SMTP server address
SMTP_PORT      → 587 (STARTTLS) or 465 (TLS)
SMTP_USER      → the sending email address
SMTP_PASSWORD  → the account password or App Password
EMAIL_FROM_NAME → the display name shown in the recipient's inbox
```

**TLS mode is auto-detected from port:**
- Port `465` → `secure: true` (full TLS from the start)
- Port `587` (default) → `secure: false` + STARTTLS upgrade after connection

**The function signature:**
```ts
sendEmail(to: string[], subject: string, body: string): Promise<void>
```
Throws an error if credentials are not configured or if the SMTP server rejects the message.

---

## The API Endpoint — `POST /api/messages/email`

**Request body:**
```json
{
  "to": ["recipient@example.com", "second@example.com"],
  "subject": "Event Reminder",
  "body": "Hello, your event is tomorrow at 10:00.",
  "scheduleAt": "2026-03-28T08:00:00.000Z",
  "eventId": "uuid-of-related-event"
}
```

| Field | Required | Notes |
|---|---|---|
| `to` | ✅ Yes | Array of email strings. At least 1. All must be valid email format. |
| `subject` | ✅ Yes | Email subject line |
| `body` | ✅ Yes | Plain text body |
| `scheduleAt` | ❌ No | ISO 8601 UTC. Omit to send immediately. |
| `eventId` | ❌ No | Links this message to a calendar event in `message_logs.event_id` |

**Success response (201):** The created `MessageLog` object.

**Error responses:**
- `400` — missing/invalid fields
- `502` — SMTP server rejected the message (with error detail)
- `500` — internal server error

**Test mode** — `POST /api/messages/email?test=true`:
Sends a test email to `body.to` without writing to the database. Used by the Settings page test button.

---

## The Frontend

### Messages Page (`/messages`)

The email tab has two components side by side:

**EmailComposer** — left panel:
- Multi-recipient input (chip style — type an address and press Enter or comma to add, × to remove)
- Subject field
- Body textarea
- Schedule toggle — when enabled, shows a `datetime-local` picker
- Send button — calls `messageApi.sendEmail()`
- Validation: at least 1 recipient, subject and body non-empty

**MessageLogPanel** — right panel:
- Shows all messages from `GET /api/messages/logs` (last 200, newest first)
- Email entries show: blue envelope icon, subject line, recipient(s), status badge, timestamp
- Status badges: amber = pending, green = sent, red = failed
- Failed entries show the error message below
- Auto-refreshes every 30 seconds

### Settings Page (`/settings`)

Under "Email / SMTP" there are fields for host, port, username, and from-name.

> **Important:** These fields are stored in `localStorage` on the device only. They do **not** affect actual sending. The sending function always reads from Vercel environment variables. These fields exist as a visual reference — actual credentials must be set in Vercel.

There is also a **Test Email** button: enter any email address and click it. It calls `POST /api/messages/email?test=true` and shows a success or failure toast.

---

## Database — What Already Exists

**No database changes are needed.** The `message_logs` table was created as part of the original schema and already has every column the email feature uses.

### `message_logs` table

```sql
CREATE TABLE IF NOT EXISTS message_logs (
  id           TEXT PRIMARY KEY,             -- UUID v4
  type         TEXT NOT NULL,                -- 'email' or 'whatsapp'
  status       TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'failed'
  recipient    TEXT NOT NULL,                -- comma-separated email addresses
  subject      TEXT,                         -- email subject line
  message      TEXT,                         -- email body text
  scheduled_at TEXT NOT NULL,                -- ISO 8601 — when to send
  sent_at      TEXT,                         -- ISO 8601 — when actually sent (NULL until sent)
  error        TEXT,                         -- error string if status='failed'
  event_id     TEXT,                         -- optional FK → events.id
  created_at   TEXT DEFAULT (datetime('now'))
)
```

### How a sent email looks in the DB

| column | example value |
|---|---|
| `id` | `"a1b2c3d4-..."` |
| `type` | `"email"` |
| `status` | `"sent"` |
| `recipient` | `"alice@gmail.com, bob@gmail.com"` |
| `subject` | `"Event Reminder: Team Meeting"` |
| `message` | `"Hi, your event is tomorrow at 10:00 AM."` |
| `scheduled_at` | `"2026-03-28T08:00:00.000Z"` |
| `sent_at` | `"2026-03-28T08:00:12.453Z"` |
| `error` | `NULL` |
| `event_id` | `"evt-uuid-here"` or `NULL` |
| `created_at` | `"2026-03-27T14:23:00.000Z"` |

### Status lifecycle

```
INSERT → status = 'pending'
              │
    ┌─────────┴──────────┐
    │ sent immediately   │ scheduled — wait for cron
    ▼                    ▼
status = 'sent'     cron fires → tries to send
sent_at = now            │
                  ┌──────┴──────┐
                  ▼             ▼
            status='sent'  status='failed'
            sent_at=now    error='...'
```

---

## What You Need to Do to Activate Email

The feature is fully built and deployed. The only step remaining is adding credentials to Vercel.

### Step 1 — Add environment variables on Vercel

Go to: **Vercel dashboard → Your project → Settings → Environment Variables**

Add these 5 variables:

| Variable | Example value | Notes |
|---|---|---|
| `SMTP_HOST` | `smtp.gmail.com` | Your email provider's SMTP server |
| `SMTP_PORT` | `587` | `587` for STARTTLS (recommended), `465` for TLS |
| `SMTP_USER` | `yourname@gmail.com` | The email address messages are sent from |
| `SMTP_PASSWORD` | `abcd efgh ijkl mnop` | See Step 2 below — NOT your regular password |
| `EMAIL_FROM_NAME` | `Calendar App` | The display name recipients see in their inbox |

After adding, click **"Redeploy"** (or push any commit) for the variables to take effect.

### Step 2 — Generate a Gmail App Password

Regular Gmail passwords do not work with SMTP. You need an App Password:

1. Go to your Google Account → **Security**
2. Make sure **2-Step Verification** is turned ON (required)
3. Search for **"App Passwords"** in the search bar at the top
4. Click App Passwords → Choose app: **Mail** → Choose device: **Other** → name it `Calendar App`
5. Google shows a **16-character password** (e.g. `abcd efgh ijkl mnop`)
6. Copy it exactly (spaces included are fine — or remove them) → paste as `SMTP_PASSWORD` in Vercel

> If you are using a provider other than Gmail (Outlook, SendGrid, custom SMTP), check that provider's documentation for SMTP credentials. The `SMTP_HOST`, `SMTP_PORT`, and credential format will differ.

### Step 3 — Test it

1. Go to the app → **Settings** → scroll to "Email / SMTP"
2. Enter your own email address in the test field
3. Click **Test Email**
4. You should receive a test message within 30 seconds
5. If it fails, the toast will show the SMTP error — check your credentials and try again

---

## Cron Job — Important Limitation

The Vercel **Hobby plan** only supports cron jobs that run **once per day**. The current schedule is `0 8 * * *` (8 AM UTC daily).

**What this means for scheduling:**
- If you schedule an email for 3 PM, it will not send until the next 8 AM UTC cron run
- If you need near-real-time scheduling (within 15–30 minutes of the target time), upgrading to Vercel Pro enables cron jobs as frequent as every minute

**The current `vercel.json` cron schedule:**
```json
{
  "crons": [
    {
      "path": "/api/messages/cron",
      "schedule": "0 8 * * *"
    }
  ]
}
```

On Vercel Pro this would change to:
```json
"schedule": "*/15 * * * *"
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Test button shows "Email test failed" | Wrong SMTP credentials | Double-check `SMTP_USER` and `SMTP_PASSWORD` in Vercel env vars. For Gmail, ensure you're using an App Password, not your account password. |
| Email goes to spam | `EMAIL_FROM_NAME` / `SMTP_USER` mismatch | Make sure `SMTP_USER` is a real, verified email address |
| `status = 'failed'` in log | SMTP error | Check `error` column in `message_logs` — it contains the exact SMTP rejection message |
| Scheduled email never sent | Cron not running or Hobby plan | Check Vercel dashboard → Cron Jobs tab to see last run time |
| "SMTP credentials not configured" error | Env var missing | Make sure all 4 SMTP vars are set in Vercel and a redeploy has happened |

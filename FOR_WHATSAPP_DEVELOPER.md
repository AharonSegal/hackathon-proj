# Instructions for WhatsApp/Email Integration Developer
### Project: Calendar App — Vercel Deployment
### Document Owner: Project Manager
### Last Updated: 2026-03-27

---

## FIRST: About Your Claim "This Code Can Send Emails and WhatsApps"

You are correct — **locally**, your current setup can send both.
However, there is a critical gap between **local sending** and **production sending on Vercel**.

Here is the exact problem:

| Your current setup | What Vercel needs |
|---|---|
| Evolution API runs on `localhost:8080` | Must be reachable at a **public HTTPS URL** |
| n8n runs on `localhost:5678` | Must be reachable at a **public HTTPS URL** |
| Express server runs on `localhost:3000` | Replaced by Vercel serverless functions (already done in our app) |
| Docker keeps processes alive 24/7 | Vercel functions are stateless — they spin up per request and die in 30 seconds |
| WhatsApp connection stays open via WebSocket | **Cannot run on Vercel** — requires a persistent server |

**Bottom line:** What you built works perfectly on a local machine or a dedicated server. It does NOT work as-is on Vercel because Vercel cannot run Docker containers or maintain persistent connections. The sending logic itself is fine — only the **hosting** of Evolution API and n8n needs to be addressed.

---

## 1. Our Goal

We have a **calendar and productivity app deployed on Vercel**. We need it to:

1. **Send WhatsApp messages** to a phone number — immediately or at a scheduled time
2. **Send emails** to one or more addresses — immediately or at a scheduled time
3. **Log every message** (sent, pending, failed) in our database
4. **Work entirely through our Vercel app** — meaning our app calls your service via a simple HTTP API call, and your service handles the actual sending
5. **Require zero manual steps** once set up — no QR rescanning, no Docker restarts, no local servers

### What we already have on our side (Vercel app):
- A database (Turso/libSQL) with a `message_logs` table that tracks every message
- API routes: `POST /api/messages/whatsapp`, `POST /api/messages/email`
- A cron job that processes scheduled messages every 15 minutes
- A full frontend UI: composer for WhatsApp, composer for email, message log panel
- Settings page where API keys and credentials can be configured

### What we need from you:
A sending service that our Vercel app can call with a simple HTTP POST, and it handles the actual delivery to WhatsApp and email. All we need to do is add your credentials as environment variables on Vercel.

---

## 2. What You Currently Have

Based on the code and documentation you provided:

### ✅ What works:
| Component | Status | Notes |
|---|---|---|
| **Evolution API** | ✅ Configured | Docker container, connects to WhatsApp via QR scan, can send messages |
| **n8n** | ✅ Configured | Docker container, receives webhook, routes to Evolution API and email |
| **Express server** | ✅ Working | Validates input, converts datetime, forwards to n8n webhook |
| **WhatsApp sending** | ✅ Works locally | Via Evolution API → WhatsApp Web protocol |
| **Email sending** | ✅ Works locally | Via n8n Gmail/SMTP node |
| **Scheduling** | ✅ Works locally | n8n handles the timing delay |
| **Docker Compose** | ✅ Ready | All 4 containers start with one command |
| **`.env` config** | ✅ Complete | API keys, DB credentials, Redis all configured |

### ❌ What is missing for Vercel integration:
| Missing Piece | Why It's Needed |
|---|---|
| **Public URL for Evolution API** | Our Vercel app cannot reach `localhost:8080` |
| **Public URL for n8n webhook** | Our Vercel app cannot reach `localhost:5678` |
| **HTTPS on both services** | Vercel will reject HTTP webhook calls in production |
| **Persistent hosting** | Docker on your laptop = down when laptop is off or restarts |
| **QR code persistence** | WhatsApp disconnects when Evolution API restarts — needs auto-reconnect or persistent session |
| **One simple API endpoint for us to call** | We need a single URL + token, not multiple services to coordinate |
| **Documented environment variables** | We need to know exactly which env vars to add to Vercel |

---

## 3. Your Options

There are **3 paths** you can take. Each is fully described below.
**We strongly prefer Option 1 or Option 2.**

---

## OPTION 1 — Host Evolution API + n8n on a VPS (Recommended)
### "Put your Docker setup on a server, give us a public URL"

This is the cleanest path. Your existing Docker setup stays exactly as-is. You just move it from your local machine to a cloud server.

### Step-by-step:

#### Step 1: Get a VPS
- Any provider works: DigitalOcean, Hetzner, AWS EC2, Linode, Vultr
- Minimum specs: **2GB RAM, 1 CPU, 20GB disk** (Evolution API + n8n + Postgres + Redis)
- Recommended: Hetzner CX22 (~€4/month) or DigitalOcean Basic ($6/month)
- The server needs a **public IP address**

#### Step 2: Get a domain or subdomain (optional but recommended)
- Example: `whatsapp.yourname.com` pointing to the VPS IP
- Needed for HTTPS (Vercel blocks non-HTTPS in production)
- Free option: use a free subdomain from Cloudflare Tunnel (see Step 4 alternative)

#### Step 3: Install Docker on the VPS
```bash
# Ubuntu/Debian:
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo apt install docker-compose-plugin -y
```

#### Step 4: Set up HTTPS (2 options)

**Option 4A — Nginx + Let's Encrypt (if you have a domain):**
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
sudo certbot --nginx -d whatsapp.yourname.com
```
Then configure Nginx to proxy:
- `whatsapp.yourname.com/api/` → `localhost:8080` (Evolution API)
- `whatsapp.yourname.com/n8n/` → `localhost:5678` (n8n)

**Option 4B — Cloudflare Tunnel (no domain needed, free):**
```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
./cloudflared tunnel --url http://localhost:8080
# This gives you a free HTTPS URL like: https://xxxxx.trycloudflare.com
```

#### Step 5: Copy your Docker files to the VPS
```bash
# From your local machine:
scp docker-compose.yml .env root@YOUR_VPS_IP:/opt/whatsapp-service/
ssh root@YOUR_VPS_IP
cd /opt/whatsapp-service
```

#### Step 6: Update the .env on the VPS
Change these two lines (everything else stays the same):
```env
SERVER_URL=https://whatsapp.yourname.com   # your public URL
DATABASE_CONNECTION_URI=postgresql://admin_user:admin_password@evolution-postgres:5432/evolution?schema=public
```

#### Step 7: Start everything
```bash
docker network create dokploy-network
docker compose up -d
docker logs -f evolution_api   # scan the QR code with your WhatsApp phone
```

#### Step 8: Create the n8n workflow
1. Open `https://whatsapp.yourname.com:5678` (or your n8n URL)
2. Create a new workflow
3. Add a **Webhook** trigger node — set URL to `/webhook/send-message`, method: POST
4. Add an **IF** node: condition `sendWhatsApp == true`
   - TRUE branch: add **HTTP Request** node:
     - URL: `http://evolution_api:8080/message/sendText/YOUR_INSTANCE_NAME`
     - Method: POST
     - Header: `apikey: VrpuJ3ytjkzNv77aWPixzrrWEhcgrp`
     - Body: `{ "number": "{{ $json.phone }}", "textMessage": { "text": "{{ $json.message }}" } }`
5. Add another **IF** node: condition `sendEmail == true`
   - TRUE branch: add **Send Email** node with your SMTP credentials
6. Save and **Activate** the workflow (Production mode, not Test)
7. Copy the Production webhook URL — it will look like:
   `https://whatsapp.yourname.com/webhook/XXXX`

#### Step 9: What to give us
```
N8N_WEBHOOK_URL=https://whatsapp.yourname.com/webhook/XXXX
EVOLUTION_API_URL=https://whatsapp.yourname.com
EVOLUTION_API_KEY=VrpuJ3ytjkzNv77aWPixzrrWEhcgrp
EVOLUTION_INSTANCE_NAME=my_app_session
```
We add these 4 lines to Vercel. Done.

---

## OPTION 2 — Replace Evolution API with UltraMsg (Fully Managed, No Server)
### "Let UltraMsg host the WhatsApp connection for you"

UltraMsg is a paid cloud service that runs Evolution API (the same technology you're using) on their servers. You scan QR once on their web dashboard, and they stay connected permanently.

**Advantage:** Zero infrastructure. No server, no Docker, no maintenance. You just call their HTTP API.

### Step-by-step:

#### Step 1: Create UltraMsg account
- Go to **ultramsg.com**
- Sign up for an account
- Start a free trial or purchase a plan (~$15/month for 1 instance)

#### Step 2: Create an instance and connect WhatsApp
1. Click "Create Instance"
2. Give it a name (e.g. `calendar_app`)
3. A QR code will appear
4. Open WhatsApp on the phone that will be used for sending
5. Go to WhatsApp → Settings → Linked Devices → Link a Device
6. Scan the QR code
7. Status will change to "Connected"
8. Copy the **Instance ID** and **Token** from the dashboard

#### Step 3: Test it works
```bash
curl -X POST "https://api.ultramsg.com/YOUR_INSTANCE_ID/messages/chat" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=YOUR_TOKEN&to=972501234567&body=Test message"
```
You should receive the WhatsApp message immediately.

#### Step 4: For email — use Resend
- Go to **resend.com**
- Sign up (free: 3,000 emails/month)
- Add and verify your sending domain (or use sandbox for testing)
- Copy your API key

#### Step 5: What to give us
```
ULTRAMSG_INSTANCE_ID=instance12345
ULTRAMSG_TOKEN=your_token_here
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
EMAIL_FROM_ADDRESS=notifications@yourdomain.com
EMAIL_FROM_NAME=Calendar App
```
We add these 5 lines to Vercel. Done.

**No n8n needed. No Docker. No server.**

---

## OPTION 3 — Use Official Meta WhatsApp Business API
### "Get approved by Meta, use their cloud API directly"

This is the most "official" path but requires Meta Business Platform approval.

### Requirements:
- A Facebook Business account (verified)
- A phone number not already on WhatsApp (a new number or a number you're willing to migrate)
- Meta approval (can take 1-7 business days)

### Step-by-step:
1. Go to developers.facebook.com → My Apps → Create App
2. Add the "WhatsApp" product
3. Go to WhatsApp → Getting Started → get your Phone Number ID and Temporary Token
4. For a permanent token: create a System User in Meta Business Settings
5. For production: submit your business for verification

### What to give us:
```
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxx
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your_app_password_16_chars
```

**Note:** This path requires no server but does require Meta approval and a dedicated phone number.

---

## 4. Addressing Your Statement: "This Code Can Send Emails and WhatsApps"

| Claim | Reality |
|---|---|
| ✅ "The code can send WhatsApp messages" | TRUE — on a local machine with Docker running and a phone connected via QR |
| ✅ "The code can send emails" | TRUE — via n8n Gmail node when Docker is running |
| ❌ "It works for our production Vercel app" | NOT YET — our app cannot reach localhost services |
| ❌ "It will keep working after your laptop restarts" | NOT YET — Docker and WhatsApp session need persistent hosting |
| ❌ "It will keep working if WhatsApp disconnects" | NOT YET — needs auto-reconnect logic or managed service |

**In summary:** You have built the sending engine correctly. What is missing is making that engine accessible from the internet so our Vercel app can call it.

---

## 5. Final Deliverables Checklist

When you are done, you must hand over **ALL** of the following. We will not be able to integrate without every item on this list.

### If you chose Option 1 (VPS):
- [ ] VPS is running and accessible 24/7
- [ ] Evolution API is accessible at a public HTTPS URL
- [ ] n8n is accessible at a public HTTPS URL
- [ ] WhatsApp is connected (green status in Evolution API dashboard)
- [ ] n8n workflow is created, saved, and **Activated** (Production mode)
- [ ] n8n webhook URL is in Production mode (not Test mode — Test mode only works while n8n UI is open)
- [ ] A test message has been successfully sent to a real phone number
- [ ] A test email has been successfully sent to a real inbox
- [ ] Auto-restart is configured (Docker `restart: always` in compose file)
- [ ] WhatsApp session persists after `docker compose restart` (volumes configured)
- [ ] **Exact environment variables to add to Vercel** (copy-paste ready, no placeholders)
- [ ] Documentation: what to do if WhatsApp disconnects (who scans the QR, how to reconnect)

### If you chose Option 2 (UltraMsg):
- [ ] UltraMsg account created and active
- [ ] WhatsApp instance connected (green status)
- [ ] Resend account created and sending domain verified
- [ ] Test WhatsApp message sent successfully
- [ ] Test email sent successfully
- [ ] **Exact environment variables to add to Vercel** (copy-paste ready, no placeholders)

### If you chose Option 3 (Meta API):
- [ ] Meta Business account verified
- [ ] WhatsApp Phone Number ID obtained
- [ ] Permanent Access Token created (not the temporary one that expires)
- [ ] Test message sent via the API
- [ ] Gmail App Password generated for SMTP
- [ ] **Exact environment variables to add to Vercel** (copy-paste ready, no placeholders)

### Required from ANY option:
- [ ] **A simple test**: call the API from a tool like Postman or curl and show it works
- [ ] **The exact variables** — no `YOUR_VALUE_HERE` placeholders, actual working values
- [ ] **Instructions for renewal** — what expires? tokens? subscriptions? when?
- [ ] **One phone number confirmed** that can receive WhatsApp messages from the service

---

## 6. What We Will Do On Our Side

Once you hand us the environment variables, we will:
1. Add them to Vercel's environment variable dashboard (takes 5 minutes)
2. Update `lib/whatsapp.ts` to call your service instead of Meta API (already written, just need to swap URLs)
3. Update `lib/email.ts` if using a new service
4. Test end-to-end from our UI
5. Deploy

**We will NOT need to touch your Docker setup, your server, or your n8n workflow.**

---

## 7. Contact & Questions

If you have questions about how our app calls the sending service, here is the exact API shape we call internally:

**For WhatsApp:**
```
POST /api/messages/whatsapp
Body: {
  "to": "+972501234567",      // E.164 format with + prefix
  "message": "Hello!",
  "scheduleAt": "2026-03-27T15:00:00.000Z"  // optional — omit to send now
}
```

**For Email:**
```
POST /api/messages/email
Body: {
  "to": ["user@example.com"],
  "subject": "Event Reminder",
  "body": "Hello, your event is tomorrow.",
  "scheduleAt": "2026-03-27T15:00:00.000Z"  // optional — omit to send now
}
```

These are our internal routes — our Vercel app already handles these. What we need from you is the credentials so that when these routes call `sendWhatsApp()` or `sendEmail()`, they reach a live service.

---

*Document prepared by the project manager. Please read every section carefully before beginning work.*

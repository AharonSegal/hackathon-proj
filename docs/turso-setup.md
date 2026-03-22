# Turso Setup Guide

Turso is a free cloud database. It replaces Docker + local SQLite — you don't run anything locally, the database lives in the cloud and the app connects to it automatically.

---

## What is Turso?

Think of it like Google Drive but for your database. Your calendar events and message logs are stored there. It's free for personal use (up to 500 databases, 1 GB storage). No credit card needed.

---

## Step-by-step setup

### 1. Create a free Turso account

Go to **[app.turso.tech/sign-up](https://app.turso.tech/sign-up)**

Sign up with GitHub (easiest) or email. You'll be on the free tier automatically.

---

### 2. Create a database

Once logged in:

1. Click **"Create Database"**
2. Name it anything — e.g. `calendar-app`
3. Pick the region closest to you (or just leave the default)
4. Click **"Create Database"**

That's it. The tables (`events`, `message_logs`) are created automatically the first time the app runs.

---

### 3. Get your Database URL

1. Click on your new database in the Turso dashboard
2. Click the **"Connect"** button (or look for "Connection URL")
3. Copy the URL — it looks like:
   ```
   libsql://calendar-app-yourusername.turso.io
   ```
   This is your **`TURSO_DATABASE_URL`**

---

### 4. Generate an Auth Token

Still on the database page:

1. Click **"Generate Token"** (or go to the **"Tokens"** tab)
2. Leave the expiry as **"No expiry"** (so it doesn't stop working)
3. Click **"Generate"**
4. **Copy the token immediately** — you won't be able to see it again

This long string is your **`TURSO_AUTH_TOKEN`**

---

### 5. Add to Vercel

1. Go to your Vercel project: **[vercel.com/dashboard](https://vercel.com/dashboard)** → click your project
2. Click **"Settings"** (top navigation)
3. Click **"Environment Variables"** (left sidebar)
4. Add two variables:

| Name | Value |
|---|---|
| `TURSO_DATABASE_URL` | `libsql://calendar-app-yourusername.turso.io` |
| `TURSO_AUTH_TOKEN` | the long token string you copied |

5. Click **"Save"** after each one
6. Go to **"Deployments"** tab → click the **"..."** menu on the latest deployment → click **"Redeploy"**

---

### 6. Verify it works

After the redeploy finishes (~1 min):

- Open your app
- The **Connection card** on the Dashboard should turn **green**
- Create a test event in the Calendar — it should save and reload correctly

---

## That's it

You never need to touch Turso again. The database runs in the cloud 24/7. Your data persists forever (until you delete the database). Vercel connects to it automatically using the two env vars you set.

---

## Why I can't do this for you

Turso requires creating an account under your name and generating credentials that are private to you. I can't log in to websites or create accounts. But the setup above takes about 3 minutes.

---

## Troubleshooting

**Dashboard still shows "Offline" after adding env vars**
→ Make sure you clicked "Redeploy" in Vercel after saving the env vars. Env vars are baked in at deploy time, not read live.

**"TURSO_DATABASE_URL env var is not set" error**
→ The variable name must be exactly `TURSO_DATABASE_URL` (all caps, underscores). Check for typos in Vercel's env var settings.

**Token stopped working**
→ You set an expiry when generating the token. Generate a new one in Turso with "No expiry" and update it in Vercel → redeploy.

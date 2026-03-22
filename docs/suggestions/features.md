# General Feature Suggestions

Larger feature ideas that span both frontend and backend.

---

## Collaboration

- **Multi-user support** — user accounts with separate calendars; share a calendar with others (read-only or editor access)
- **Public calendar links** — generate a shareable read-only URL for a calendar so anyone can view it without logging in
- **Invitation RSVP** — when sending a WhatsApp/email invitation, include a link the recipient can click to confirm attendance; RSVP status updates the event in the DB
- **Team calendars** — multiple people in the same organization can contribute events to a shared calendar view

## Integrations

- **Google Calendar sync** — two-way sync with Google Calendar via the Google Calendar API (import events, export events)
- **Outlook / Exchange sync** — same via Microsoft Graph API
- **Telegram bot** — alternative to WhatsApp; send event reminders via a Telegram bot (simpler setup, no Meta approval required)
- **WhatsApp groups** — support sending to a WhatsApp group chat ID (not just individual numbers)
- **SMS fallback** — if WhatsApp delivery fails, fall back to SMS via Twilio
- **Zapier / Make webhook** — expose a `POST /api/events/webhook` endpoint so external tools can create events (e.g. from Google Forms, Typeform, etc.)

## Hebrew / Jewish Features

- **Zmanim notifications** — send a daily WhatsApp/email at dawn with the day's zmanim for the configured location
- **Parasha summary** — display a short description of the weekly Torah portion alongside the parasha name
- **Jewish year view** — a full Hebrew year overview (Tishrei → Elul) in one screen
- **Bar/Bat Mitzvah date calculator** — input a Gregorian birthdate and get the Hebrew date + parasha of the 13th/12th Hebrew birthday
- **Shabbat candle-lighting alerts** — send an automated WhatsApp message every Friday 30 minutes before candle-lighting time
- **Molad announcements** — automatically post the monthly Molad (new moon calculation) to a WhatsApp group

## Productivity

- **Event templates** — create reusable event templates (e.g. "Weekly Meeting") that pre-fill the form with common fields
- **Recurring events** — daily / weekly / monthly / yearly recurrence with an end date or count
- **Task / to-do integration** — attach a checklist to an event (e.g. "bring cake", "send invitations", "book venue")
- **Notes / attachments** — attach a file or a long-form note to any event (store in Cloudflare R2 or Vercel Blob)
- **Calendar analytics** — insights page showing busiest days/months, most common event types, message success rates
- **AI event suggestions** — given a title (e.g. "Shabbat dinner"), suggest a description, color, time, and a pre-written WhatsApp invitation using the Claude API

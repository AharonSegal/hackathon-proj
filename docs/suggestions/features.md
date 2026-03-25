# General Feature Suggestions

Larger feature ideas that span both frontend and backend.

---

## Already Built ✅

- **Soft-delete trash bin** — notes and events are soft-deleted (`deleted_at`), appear in TrashPage, can be restored or permanently deleted
- **Todos with rocket animation** — full CRUD todos page with rocket-launch completion sequence and confetti
- **File attachments** — attach files to any note or event (currently client-side localStorage; see TODO for server-side upgrade)
- **Folders** — organise notes and events into color-coded folders
- **Recurring events** — daily / weekly / monthly / yearly recurrence field with recurrence end date

---

## Todos Enhancements

- **Todos in trash** — when a todo is deleted it should appear in the TrashPage just like notes and events; requires `deleted_at` column and trash table integration
- **Due dates** — `due_date` column on todos; overdue items highlighted; optional reminder WhatsApp/email on the due date
- **Priority levels** — low / medium / high / urgent; color-coded badges; sort by priority
- **Todo categories / tags** — tag todos the same way notes are tagged; filter panel in TodosPage
- **Subtasks** — nest sub-todos under a parent todo (tree structure in DB via `parent_id`)
- **Recurring todos** — mark a todo as repeating (e.g. "every Monday") so it auto-recreates after completion
- **Attach a note to a todo** — link a todo to a note for extra context

## Notes Enhancements

- **Note linking** — `[[Note Title]]` wiki-style links between notes (backlinks panel)
- **Note templates** — pre-built templates for meeting notes, weekly planning, Shabbat prep, etc.
- **Full-text search** — search across all note content (BlockNote blocks), not just titles
- **Note version history** — store previous versions in a `note_versions` table; restore any version
- **Note sharing** — generate a read-only public URL for a single note
- **Pinned notes section** — visually separate pinned notes at the top of the list with a divider

## Collaboration

- **Multi-user support** — user accounts with separate calendars; share with others (read-only or editor)
- **Public calendar links** — shareable read-only URL for a calendar
- **Invitation RSVP** — include a link in WhatsApp/email invitations so recipients can confirm attendance
- **Team calendars** — multiple people contribute to a shared calendar view

## Integrations

- **Google Calendar sync** — two-way sync via Google Calendar API
- **Outlook / Exchange sync** — via Microsoft Graph API
- **Telegram bot** — send event reminders via Telegram (simpler setup than WhatsApp, no Meta approval)
- **WhatsApp groups** — send to a WhatsApp group chat ID, not just individual numbers
- **SMS fallback** — if WhatsApp delivery fails, fall back to SMS via Twilio
- **Zapier / Make webhook** — `POST /api/events/webhook` so external tools can create events

## Hebrew / Jewish Features

- **Zmanim notifications** — daily WhatsApp/email at dawn with the day's zmanim for the configured location
- **Parasha summary** — short description of the weekly Torah portion alongside the parasha name
- **Jewish year view** — full Hebrew year overview (Tishrei → Elul) on one screen
- **Bar/Bat Mitzvah calculator** — input a Gregorian birthdate → get Hebrew date + parasha of 13th/12th birthday
- **Shabbat candle-lighting alerts** — automated WhatsApp every Friday 30 min before candle-lighting
- **Molad announcements** — automatically post the monthly Molad to a WhatsApp group

## Productivity

- **Event templates** — reusable event templates (e.g. "Weekly Meeting") that pre-fill the form
- **Calendar analytics** — insights page: busiest days, most common event types, message success rates
- **AI event suggestions** — given a title (e.g. "Shabbat dinner"), suggest description, color, time, and a pre-written WhatsApp invitation via the Claude API
- **Attachment server storage** — move file attachments from localStorage to Vercel Blob or Cloudflare R2 for cross-device persistence

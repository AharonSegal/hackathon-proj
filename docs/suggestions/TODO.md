# TODO

Active tasks and known issues that need attention.

---

## High Priority

- [ ] **Error boundary** — add a React `ErrorBoundary` component wrapping each page so a crash in one page doesn't blank the entire app (current: uncaught errors show a white screen)
- [ ] **Event pagination** — `GET /api/events` returns all events; add server-side pagination or month filtering so the app stays fast as the event count grows
- [ ] **Mobile layout** — sidebar overlaps content on small screens; needs a hamburger menu / drawer

## Medium Priority

- [ ] **Recurring events** — support daily / weekly / monthly / yearly recurrence rules
- [ ] **Event search** — search bar to filter events by title or date range
- [ ] **Message log pagination** — currently fetches last 200 rows; add load-more or infinite scroll
- [ ] **WhatsApp delivery status webhook** — Meta sends delivery receipts to a webhook URL; wire this up to update `message_logs.status` automatically
- [ ] **Offline write queue** — when backend is offline, queue create/update/delete operations and replay them when connectivity is restored
- [ ] **Multi-timezone support** — allow per-event timezone override (currently all times are local)

## Low Priority

- [ ] **Dark/light theme toggle** — app is dark-only; add a theme switcher
- [ ] **Export to .ics** — let users export events as an iCalendar file for import into Google Calendar / Outlook
- [ ] **Drag-and-drop events** — drag an event pill to a different day to reschedule
- [ ] **Keyboard shortcuts** — `n` for new event, `t` for today, arrow keys to navigate months
- [ ] **PWA / installable** — add a web app manifest so users can install it on their phone home screen

## Bugs / Known Issues

- [ ] `useBackendStatus` poller starts a `setInterval` that is never cleared (no cleanup on app unmount — low impact in practice since the app is always mounted)
- [ ] Hebrew month navigation wraps on `months.NISAN` → `months.ADAR_I` which is correct for regular years, but needs a test for Adar I/II leap year edge cases
- [ ] `api/messages/email/test.ts` and `api/messages/whatsapp/test.ts` — not yet documented; make sure credentials are validated before sending test messages

---

*Last updated: 2026-03-22*

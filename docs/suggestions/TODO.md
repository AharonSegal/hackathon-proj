# TODO

Active tasks and known issues that need attention.

---

## High Priority

- [ ] **Todos soft-delete** — currently `DELETE /api/todos/:id` is a hard delete; todos should go through the trash the same way notes and events do (add `deleted_at` column, insert into `trash` table, restore via TrashPage)
- [ ] **Attachments persistence** — file attachments for notes and events are stored in `localStorage` only; they disappear on a new device / browser clear. Move to server-side storage (Vercel Blob or Cloudflare R2) so they persist permanently
- [ ] **Error boundary** — add a React `ErrorBoundary` wrapping each page so a crash in one page doesn't blank the entire app (currently uncaught errors show a white screen)
- [ ] **Mobile layout** — sidebar overlaps content on small screens; needs a hamburger menu / drawer and touch-friendly interactions

## Medium Priority

- [ ] **Todo due dates** — add a `due_date TEXT` column to the `todos` table and a date picker in the UI; show overdue todos highlighted in red
- [ ] **Todo categories / tags** — allow tagging todos (same pattern as notes/events) so they can be filtered
- [ ] **Trash auto-empty** — add a cron job or a check in `/api/messages/cron` that permanently deletes trash items older than 30 days
- [ ] **Attachment count in DB** — store attachment metadata in a DB table (`attachments`) rather than localStorage so the paperclip badge survives across devices
- [ ] **Note search** — full-text search across note titles and content; filter panel in the NotesList sidebar
- [ ] **Event search** — search bar to filter events by title or date range
- [ ] **Message log pagination** — currently fetches last 200 rows; add load-more or infinite scroll
- [ ] **Offline write queue** — queue create/update/delete when backend is unreachable, replay on reconnect
- [ ] **Multi-timezone support** — per-event timezone override (all times are currently local)

## Low Priority

- [ ] **Dark/light theme toggle** — app is dark-only; add a theme switcher
- [ ] **Export to .ics** — let users export events as iCalendar for Google Calendar / Outlook
- [ ] **Drag-and-drop events** — drag an event pill to reschedule it on the calendar
- [ ] **Drag-and-drop todos** — reorder active todos by dragging
- [ ] **Keyboard shortcuts** — `n` = new event/note, `t` = today, arrow keys to navigate months, `Esc` = close
- [ ] **PWA / installable** — add web app manifest so users can install it on their phone home screen
- [ ] **Confetti on all completions** — reuse the Todos confetti for other "completion" moments (e.g. marking all todos done, emptying trash)

## Bugs / Known Issues

- [ ] `useBackendStatus` poller starts a `setInterval` that is never cleared (no cleanup on unmount — low impact since app is always mounted)
- [ ] Hebrew month navigation wraps on `months.NISAN` → `months.ADAR_I`; needs a test for Adar I/II leap year edge cases
- [ ] Attachment modal `attachCount` badge on NoteCard / EventCard reads from localStorage on mount; if attachments are added/removed in the modal and the card isn't re-rendered, the badge count can be stale until next page load
- [ ] Todos `completedAt` is set client-side in `TodosContext` and re-sent on every `completeTodo` call — the server accepts it but there is no validation that it's a valid ISO string
- [ ] Cron path changed from `/api/cron/send-messages` to `/api/messages/cron` (vercel.json updated); any external manual triggers pointing to the old URL will 404

---

*Last updated: 2026-03-23*

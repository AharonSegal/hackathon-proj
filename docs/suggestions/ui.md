# UI / Frontend Suggestions

Ideas to improve the user interface and frontend experience.

---

## Calendar

- **Month/week/day view toggle** — add buttons to switch between month, week (7-column day timeline), and day (single-day hour grid) views, similar to Google Calendar
- **Event drag-and-drop** — drag an event pill to reschedule it; drag the bottom edge to resize the duration
- **Color-coded holiday categories** — use distinct colors for major holidays (red/amber), minor holidays (yellow), Israeli national days (blue), and parasha (green) instead of a single amber for all
- **Event tooltip on hover** — show a small popover with full title, time, and description when hovering over a truncated event pill (instead of requiring a click)
- **Mini month picker** — sidebar calendar widget for jumping to any month by clicking a small preview grid
- **"Today" highlight ring** — add a pulsing ring animation around today's date to make it easier to spot at a glance
- **Print view** — a clean print stylesheet that renders the current month as a paper-friendly grid

## Dashboard

- **Charts / graphs** — a simple bar chart of events per week/month, and a line chart of messages sent over time (using recharts or chart.js)
- **Quick-add widget** — inline "add event" input on the dashboard (type title + date, press Enter) without opening the full modal
- **Upcoming events timeline** — replace the flat list with a visual timeline (vertical line with dots)

## Messages

- **Message preview before send** — show a confirmation modal with the full message content before final submission
- **Bulk send** — select multiple recipients for WhatsApp and send to all of them in one action
- **Message templates library** — a dedicated screen to create, name, and reuse message templates (currently only 3 hardcoded in the WhatsApp composer)
- **Read receipts display** — show delivered/read status icons next to message log entries once webhook integration is added
- **Email HTML editor** — add a rich text / HTML mode toggle for the email composer (currently plain text only)
- **Attach files to email** — support file attachments (pass base64 or a URL to nodemailer)

## Settings

- **Import/export settings** — a button to download settings as a JSON file and another to upload/restore from a file
- **Credential validation on input** — validate SMTP / WhatsApp credentials in real-time (debounced) instead of only on "Test" button click
- **Location search** — replace the lat/lng manual input with a city search field that auto-fills coordinates (using a geocoding API or a local city database)
- **Multiple locations** — support saving multiple zmanim locations and switching between them quickly

## General UX

- **Keyboard shortcuts** — `n` = new event, `t` = today, `←/→` = prev/next month, `Esc` = close modal
- **Undo / redo** — a 5-second "Undo" toast after deleting an event (like Gmail's undo send)
- **Loading skeletons** — replace blank spaces during data fetch with animated skeleton placeholders
- **Empty states** — friendly illustrated empty states for "no events", "no messages", etc.
- **Responsive / mobile layout** — collapsible sidebar (hamburger menu), touch-friendly day cells, bottom-sheet modals on small screens
- **Accessibility (a11y)** — ensure all interactive elements have proper `aria-label`s, focus rings, and keyboard navigation
- **Onboarding tour** — a first-run walkthrough highlighting the key features for new users

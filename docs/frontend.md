# Frontend

React 18 + TypeScript + Vite single-page application. Dark-themed, fully responsive, and designed to work gracefully even when offline.

---

## Tech stack

| Tool | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | 6 | Dev server + build tool |
| Tailwind CSS | 3 | Utility-first styling |
| React Router | 6 | Client-side routing |
| Axios | 1 | HTTP requests with timeout |
| @hebcal/core | ^6 | Hebrew calendar, holidays, parasha |
| kosher-zmanim | ^0.9 | Halachic time calculations |
| @radix-ui/* | latest | Accessible Dialog, Tabs, Switch |
| sonner | latest | Toast notifications |
| lucide-react | latest | Icon set |
| clsx | latest | Conditional class names |

---

## Project structure

```
frontend/src/
├── main.tsx                    Entry point, mounts React root
├── App.tsx                     BrowserRouter + SettingsProvider + routes
├── vite-env.d.ts               Vite client types (import.meta.env)
│
├── pages/
│   ├── Calendar/
│   │   ├── CalendarPage.tsx    Page shell: loads events, opens modal on day/event click
│   │   ├── hooks/
│   │   │   └── useCalendar.ts  Grid logic: Hebrew/Gregorian, holidays, gematriya
│   │   └── components/
│   │       ├── CalendarHeader.tsx   Month title + prev/next/today nav
│   │       ├── CalendarGrid.tsx     7-column grid layout
│   │       ├── DayCell.tsx          Day cell: dates, holiday label, event pills, dot indicators
│   │       └── EventModal.tsx       Create/edit/delete event + attach WA/email
│   │
│   ├── Dashboard/
│   │   └── DashboardPage.tsx   Stat cards, today's events, upcoming events
│   │
│   ├── DailyTimes/
│   │   └── DailyTimesPage.tsx  Zmanim for any date; day navigator; parasha
│   │
│   ├── Messages/
│   │   ├── MessagesPage.tsx    Tab layout: WhatsApp (full-width + log below) / Email (2-col)
│   │   └── components/
│   │       ├── WhatsAppComposer.tsx  Toolbar, emoji picker, phone preview, schedule toggle
│   │       └── EmailComposer.tsx     Multi-recipient tags, schedule toggle
│   │
│   └── Settings/
│       └── SettingsPage.tsx    All app configuration with live previews
│
└── shared/
    ├── colors/
    │   └── index.ts            Central color palette constants
    ├── components/
    │   ├── Layout/
    │   │   ├── AppLayout.tsx   Sidebar + <Outlet> + BackendStatus + Toaster
    │   │   └── PageHeader.tsx  Title / subtitle / action slot
    │   ├── Sidebar/
    │   │   └── AppSidebar.tsx  Nav: Dashboard, Calendar, Daily Times, Messages, Settings
    │   └── ui/
    │       ├── Button.tsx      Variants: primary / secondary / ghost / danger / whatsapp / email
    │       ├── Input.tsx       Input + Textarea with label/error/hint (both use forwardRef)
    │       ├── Modal.tsx       Radix Dialog wrapper
    │       ├── Badge.tsx       Color-coded pill badge
    │       └── BackendStatus.tsx  Floating "Backend offline" pill (bottom-right)
    ├── context/
    │   └── SettingsContext.tsx  AppSettings stored in localStorage, React context
    ├── hooks/
    │   ├── useApi.ts           Axios client + localStorage cache layer
    │   └── useBackendStatus.ts Singleton poller — pings /api/health every 30s, reads db field
    └── types/
        ├── event.types.ts      CalendarEvent, ScheduledEmail, ScheduledWhatsApp, MessageLog
        └── settings.types.ts   AppSettings, HolidaySettings, ZmanimSettings, DEFAULT_SETTINGS
```

---

## Pages in detail

### Calendar

The core of the app. Driven by `useCalendar.ts`, which:

1. Maintains a `viewDate` (the "current month" anchor).
2. In **Hebrew mode**: computes the grid from the 1st of the current Hebrew month to the last day, padded to full weeks. Hebrew month navigation handles leap-year Adar I/II and year boundaries.
3. In **Gregorian mode**: standard month grid padded to full weeks.
4. Calls `HebrewCalendar.calendar()` from `@hebcal/core` for the grid date range to get holidays, parasha, candlelighting times, and Omer count — filtered by the user's Settings toggles.
5. Returns `DayInfo[]` — one object per cell, containing the Gregorian `Date`, the `HDate`, user events, Hebrew calendar events, and the rendered Hebrew numeral string.

**DayCell** renders:
- Primary label: Hebrew gematriya numeral (Hebrew mode) or Gregorian day number (today gets a colored circle)
- Secondary label: the other system's date (small, top-right)
- Up to 1 holiday label (amber text for holidays, muted for other events)
- Up to 2 user event pills (color-coded, clickable to edit) + "+N more" if needed
- Colored dot indicators (bottom-right): one dot per event, up to 3, using the event's color
- `+` hint on hover for empty days
- Shabbat tint on Saturday columns

**Interaction**:
- Click anywhere on a day cell → opens "New Event" modal for that date
- Click an event pill → opens "Edit Event" modal for that specific event (stops propagation)

**EventModal** lets you create or edit an event. Optional "Scheduled actions" section lets you attach a scheduled WhatsApp message and/or email with a custom send datetime.

### Dashboard

Shows four stat cards (total events, today's events, pending messages, sent messages), a "Today" panel listing today's events with color dots, and an "Upcoming Events" panel with the next 5 events (Gregorian + Hebrew dates).

Event color dots use a static `COLOR_DOT` map (not dynamic Tailwind interpolation) to ensure Tailwind's JIT compiler retains the color classes.

### Daily Times (Zmanim)

Uses `kosher-zmanim` (`ZmanimCalendar` + `GeoLocation`). Key notes:
- `GeoLocation` takes `(name, lat, lng, elevation, timezone)`.
- `cal.setDate(date)` selects the day.
- Methods return Luxon `DateTime` objects — convert with `.toJSDate()` before passing to `Intl.DateTimeFormat`.
- `getPlagHamincha()` requires a cast: `(calc as any).getPlagHamincha()`.
- `getTzais72()` is the 72-minute nightfall method (separate from `getTzais()`).

The 11 times are individually toggleable in Settings. The day navigator lets you browse forward/backward one day at a time. Today's parasha is shown via `HebrewCalendar.calendar()`.

### Messages

Radix `Tabs` switches between WhatsApp and Email composers. The active tab drives the page layout:

- **WhatsApp tab**: single full-width column — the composer card (with inline phone preview) takes the full width, and the message log panel sits below it.
- **Email tab**: two-column grid — email composer on the left, message log on the right.

The message log auto-refreshes every 30s and shows all sent/scheduled/failed messages with status icons.

**WhatsAppComposer**:
- Formatting toolbar: **B** (`*bold*`), *I* (`_italic_`), ~~S~~ (`~strikethrough~`), `</>` (` ```monospace``` `)
- Emoji picker: 48 common emojis in a popup grid; inserts at cursor position
- All formatting buttons wrap selected text or place the cursor between the markers
- Live phone-frame preview (always visible, right of the editor): renders WhatsApp markdown in real-time
- Hebrew quick-templates (event reminder, invitation, thank you)
- Character counter, immediate or scheduled send

**EmailComposer** — Chip-style multi-recipient input (press Enter or comma to add an address), immediate or scheduled send.

Both composers check `useBackendStatus` before submitting and show a toast error if the backend is offline.

### Settings

All settings live in `SettingsContext` (persisted to `localStorage`). Changes take effect immediately across the app without a page reload. The Settings page also sends credentials to the backend on "Save" (best-effort — failure doesn't affect local state).

---

## Offline resilience

`useApi.ts` wraps every read endpoint with a try/catch:
- **On success**: writes the response to `localStorage` under a versioned key (`cache_v1_events`, `cache_v1_message_logs`).
- **On failure**: returns the cached array silently.

Write endpoints (create/update/delete/send) throw on failure — the calling page shows a toast.

`useBackendStatus.ts` is a **singleton poller** (only one HTTP request in flight at a time, no matter how many components subscribe). It pings `GET /api/health` every 30 seconds. The health endpoint now includes a DB ping and returns `{"status":"ok","db":"ok","latencyMs":N}` — if `db` is not `"ok"`, the status is considered degraded. `BackendStatus.tsx` listens and shows a fixed pill in the bottom-right corner when offline.

---

## Routing

```
/               → Dashboard
/calendar       → Calendar
/daily-times    → Daily Times (Zmanim)
/messages       → Messages
/settings       → Settings
*               → redirects to /
```

All routes are wrapped in `AppLayout` (sidebar + outlet).

The SPA fallback is configured in `vercel.json` (repo root):
```json
{ "source": "/((?!api/).*)", "destination": "/index.html" }
```

---

## API communication

`useApi.ts` builds an Axios instance with:
- `baseURL: '/api'` — same-origin requests, no CORS, no env var needed
- `timeout: 8000 ms` — prevents hanging indefinitely

The API routes live in `api/` at the repo root and are served by Vercel on the same domain as the React bundle.

---

## Tailwind theme

Extended in `tailwind.config.ts`:

| Token | Value |
|---|---|
| `primary-*` | Indigo scale (500 = `#6366f1`) |
| `app-bg` | `#0f172a` (slate-900) |
| `app-surface` | `#1e293b` (slate-800) |
| `app-border` | `#334155` (slate-700) |

The `.card` utility class (defined in `globals.css`) applies `bg-app-surface border border-app-border rounded-xl p-4`.

**Important**: Dynamic Tailwind class interpolation (e.g. `` `bg-${color}-500` ``) does not work because Tailwind's JIT scanner cannot detect these at build time. All color-mapped classes use static lookup objects (e.g. `COLOR_DOT`, `EVENT_DOT_COLORS`, `EVENT_PILL_COLORS`).

---

## Build output

`npm run build` (run from `frontend/`) produces `frontend/dist/` — a fully static bundle deployed to Vercel's CDN.

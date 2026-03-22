# Frontend

React 18 + TypeScript + Vite single-page application. Dark-themed, fully responsive, and designed to work gracefully even when the backend is offline.

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
src/
├── main.tsx                    Entry point, mounts React root
├── App.tsx                     BrowserRouter + SettingsProvider + routes
├── vite-env.d.ts               Vite client types (import.meta.env)
│
├── pages/
│   ├── Calendar/
│   │   ├── CalendarPage.tsx    Page shell: loads events, opens modal
│   │   ├── hooks/
│   │   │   └── useCalendar.ts  Grid logic: Hebrew/Gregorian, holidays, gematriya
│   │   └── components/
│   │       ├── CalendarHeader.tsx   Month title + prev/next/today nav
│   │       ├── CalendarGrid.tsx     7-column grid layout
│   │       ├── DayCell.tsx          Individual day: dates, holiday labels, event pills
│   │       └── EventModal.tsx       Create/edit/delete event + attach WA/email
│   │
│   ├── Dashboard/
│   │   └── DashboardPage.tsx   Stat cards, today's events, upcoming events
│   │
│   ├── DailyTimes/
│   │   └── DailyTimesPage.tsx  Zmanim for any date; day navigator; parasha
│   │
│   ├── Messages/
│   │   ├── MessagesPage.tsx    Tabbed layout: composers + message log
│   │   └── components/
│   │       ├── WhatsAppComposer.tsx  Templates, preview, schedule toggle
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
    │       ├── Input.tsx       Input + Textarea with label/error/hint
    │       ├── Modal.tsx       Radix Dialog wrapper
    │       ├── Badge.tsx       Color-coded pill badge
    │       └── BackendStatus.tsx  Floating "Backend offline" pill (bottom-right)
    ├── context/
    │   └── SettingsContext.tsx  AppSettings stored in localStorage, React context
    ├── hooks/
    │   ├── useApi.ts           Axios client + localStorage cache layer
    │   └── useBackendStatus.ts Singleton poller — pings /api/health every 30 s
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
5. Returns `DayInfo[]` — one object per cell, containing both the Gregorian `Date`, the `HDate`, user events, Hebrew calendar events, and the rendered Hebrew numeral string.

**DayCell** renders:
- Primary label: Hebrew gematriya numeral (Hebrew mode) or Gregorian day number
- Secondary label: the other system's date
- Holiday labels from `hebrewEvents` (small text, muted)
- User event pills (color-coded)
- Shabbat tint on Saturday columns

**EventModal** lets you create or edit an event. Optional "Scheduled actions" section lets you attach a scheduled WhatsApp message and/or email with a custom send datetime.

### Daily Times (Zmanim)

Uses `kosher-zmanim` (`ZmanimCalendar` + `GeoLocation`). Key notes:
- `GeoLocation` takes `(name, lat, lng, elevation, timezone)`.
- `cal.setDate(date)` selects the day.
- Methods return Luxon `DateTime` objects — convert with `.toJSDate()` before passing to `Intl.DateTimeFormat`.
- `getPlagHamincha()` requires a cast: `(calc as any).getPlagHamincha()`.
- `getTzais72()` is the 72-minute nightfall method (separate from `getTzais()`).

The 11 times are individually toggleable in Settings. The day navigator lets you browse forward/backward one day at a time. Today's parasha is shown via `HebrewCalendar.calendar()`.

### Messages

Radix `Tabs` switches between WhatsApp and Email composers. A message log panel (auto-refreshes every 30 s) shows all sent/scheduled/failed messages with status icons.

**WhatsAppComposer** — Hebrew quick-templates (event reminder, invitation, thank you), live chat preview mimicking WhatsApp's UI, character counter, immediate or scheduled send.

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

`useBackendStatus.ts` is a **singleton poller** (only one HTTP request in flight at a time, no matter how many components subscribe). It pings `GET /api/health` every 30 seconds and broadcasts `'checking' | 'online' | 'offline'` to all subscribers via a `Set` of callbacks. `BackendStatus.tsx` listens and shows a fixed pill in the bottom-right corner when offline.

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

---

## API communication

`useApi.ts` builds an Axios instance with:
- `baseURL`: `VITE_API_URL/api` when the env var is set (production), otherwise `/api` (proxied by Vite in dev or nginx in Docker).
- `timeout`: 8000 ms — prevents hanging indefinitely when the tunnel is slow.

The `VITE_API_URL` environment variable is set in Vercel to the current Cloudflare Tunnel URL.

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

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Production only | Full URL of the backend, e.g. `https://xyz.trycloudflare.com`. Omit in local dev — the Vite proxy handles `/api`. |

---

## Build output

`npm run build` produces `dist/` — a fully static bundle. In production this is served by nginx inside the Docker container, or deployed directly to Vercel.

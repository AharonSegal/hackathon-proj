# Clock Widget — Implementation Plan (v2)

## Libraries

| Role | Choice | Why |
|------|--------|-----|
| Analog face | `react-clock` (wojtekmaj) | Best in class — clean SVG, actively maintained, tiny, fully styleable |
| Digit flip animation | **Framer Motion** (already installed) | Premium flip effect, zero new deps, full control |
| Minimal / Digital display | Custom — pure React + CSS | It's just formatted text, no library makes sense |
| Timezone | `Intl.DateTimeFormat` (built-in) | Native, zero cost, covers all IANA timezones reliably |

**Total new dependencies: 1** (`react-clock`, ~1.6KB gzipped)

No `moment`, no `date-fns-tz`, no geocoding API, no world-clock package.

---

## Instant Loading Strategy

### Problem: most clock bugs = first render shows wrong time or empty

**Solution: synchronous initial state**
```typescript
// ❌ First render shows nothing → flash
const [time, setTime] = useState<Date | null>(null);
useEffect(() => setTime(new Date()), []);

// ✅ First render already has correct time → instant
const [time, setTime] = useState(() => new Date());
```

### Interval that doesn't leak
```typescript
useEffect(() => {
  const id = setInterval(() => setTime(new Date()), 1000);
  return () => clearInterval(id);
}, []);
```

### Timezone — synchronous, no API
```typescript
// Clock 1 default: auto-detect user system timezone
const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
// e.g. "Asia/Jerusalem" — instant, always correct

// Format any timezone:
const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: tz,
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: !use24h,
});
fmt.format(time); // "14:32:07"
```

**Result: zero network requests, zero loading spinners, renders on first paint.**

---

## Other Clock Timezones — Static City List, No API

User picks from a dropdown (Radix UI `Select`, already installed):
```typescript
export const WORLD_CITIES = [
  { label: 'Tel Aviv',      tz: 'Asia/Jerusalem' },
  { label: 'New York',      tz: 'America/New_York' },
  { label: 'Los Angeles',   tz: 'America/Los_Angeles' },
  { label: 'London',        tz: 'Europe/London' },
  { label: 'Paris',         tz: 'Europe/Paris' },
  { label: 'Berlin',        tz: 'Europe/Berlin' },
  { label: 'Dubai',         tz: 'Asia/Dubai' },
  { label: 'Mumbai',        tz: 'Asia/Kolkata' },
  { label: 'Singapore',     tz: 'Asia/Singapore' },
  { label: 'Tokyo',         tz: 'Asia/Tokyo' },
  { label: 'Sydney',        tz: 'Australia/Sydney' },
  { label: 'São Paulo',     tz: 'America/Sao_Paulo' },
  { label: 'Toronto',       tz: 'America/Toronto' },
  { label: 'Chicago',       tz: 'America/Chicago' },
  { label: 'Moscow',        tz: 'Europe/Moscow' },
  { label: 'Johannesburg',  tz: 'Africa/Johannesburg' },
  { label: 'Cairo',         tz: 'Africa/Cairo' },
  { label: 'Seoul',         tz: 'Asia/Seoul' },
  { label: 'Bangkok',       tz: 'Asia/Bangkok' },
  { label: 'Istanbul',      tz: 'Europe/Istanbul' },
] as const;
```

~1.5KB, offline, instant, no keys, no rate limits. Label is editable so user can rename freely.

---

## Three Clock Styles

### 1. Digital (default)
Large tabular-nums monospace digits in accent color. Compact, fits the dashboard header.
```
┌───────────────────┐
│  Tel Aviv         │
│  14:32:07         │  ← big, mono, accent color
│  Sat · 29 Mar     │
└───────────────────┘
```
- Framer Motion `AnimatePresence` flips each digit that changes (hour, minute, second individually)
- `font-variant-numeric: tabular-nums` → digits never shift layout

### 2. Analog
`react-clock` renders the SVG face. CSS variables drive hand/mark colors.
```
       ●
   ╲   │
    ╲  │   ← hour + minute hands styled with color theme
     ● ●
```
- `react-clock` props: `renderNumbers`, `hourHandLength`, `minuteHandLength`, hand widths
- Accent color injected via `style={{ '--clock-color': accentHex }}`
- Size: 100px mobile / 120px desktop (responsive via Tailwind `sm:` prefix)

### 3. Minimal
Ultra-compact text rows — fits 3 clocks in a tiny strip.
```
┌──────────────────────────┐
│ TLV  14:32    Sat        │
│ NYC  07:32    Sat        │
│ TKY  20:32    Sun        │
└──────────────────────────┘
```
- No animation, just formatted strings
- 1 line per clock, renders in microseconds

---

## Color Themes

6 accent themes (only the accent changes — card always stays dark slate):

| Theme    | Tailwind           | Hex       |
|----------|--------------------|-----------|
| purple   | `text-primary-400` | `#a78bfa` |
| blue     | `text-blue-400`    | `#60a5fa` |
| amber    | `text-amber-400`   | `#fbbf24` |
| emerald  | `text-emerald-400` | `#34d399` |
| rose     | `text-rose-400`    | `#fb7185` |
| slate    | `text-slate-300`   | `#cbd5e1` |

---

## Settings Schema

```typescript
// Extend AppSettings in settings.types.ts

export interface ClockEntry {
  label: string;   // editable display name, e.g. "Tel Aviv"
  tz: string;      // IANA timezone, e.g. "Asia/Jerusalem"
  show: boolean;
}

export interface ClockSettings {
  show: boolean;
  style: 'digital' | 'analog' | 'minimal';
  theme: 'purple' | 'blue' | 'amber' | 'emerald' | 'rose' | 'slate';
  showSeconds: boolean;
  use24h: boolean;
  clocks: [ClockEntry, ClockEntry, ClockEntry]; // 3 fixed slots
}

// Default:
const defaultClock: ClockSettings = {
  show: true,
  style: 'digital',
  theme: 'purple',
  showSeconds: true,
  use24h: true,
  clocks: [
    { label: 'Local',   tz: Intl.DateTimeFormat().resolvedOptions().timeZone, show: true },
    { label: 'New York', tz: 'America/New_York', show: false },
    { label: 'Tokyo',    tz: 'Asia/Tokyo',        show: false },
  ],
};
```

---

## File Structure

```
frontend/src/pages/Dashboard/components/
  ClockWidget.tsx      ← orchestrates: reads settings, renders 1–3 SingleClocks
  SingleClock.tsx      ← one clock: tick logic + style switch (digital/analog/minimal)

frontend/src/shared/data/
  worldCities.ts       ← WORLD_CITIES const array (~20 cities)

frontend/src/shared/types/settings.types.ts
  → add ClockSettings + ClockEntry

frontend/src/shared/context/SettingsContext.tsx
  → add clock defaults

frontend/src/pages/Settings/SettingsPage.tsx
  → add "Clock" section
```

---

## Dashboard Placement

`PageHeader` actions slot, beside `WeatherWidget`:

```tsx
actions={
  <>
    {settings.weather.show && <WeatherWidget ... />}
    {settings.clock.show && <ClockWidget />}   {/* ← add here */}
    <div className="flex flex-col gap-1">      {/* action buttons */}
      ...
    </div>
  </>
}
```

Both widgets share the same card skin:
```
bg-slate-900/40 rounded-2xl border border-slate-800/60 backdrop-blur-sm
```

---

## Mobile Responsive

**Dashboard header** — clocks and weather wrap naturally:
```tsx
// PageHeader actions: flex flex-wrap gap-3 items-start
```
- On mobile (<640px): weather stacks above clock, both full-width
- Clock card: `min-w-[140px] max-w-[320px]`

**Multiple clocks layout:**
- Digital/Analog: `flex flex-col gap-3 sm:flex-row sm:gap-4`
- Minimal: always a column (that's its design)

**Analog clock size:**
```tsx
<Clock size={typeof window !== 'undefined' && window.innerWidth < 640 ? 90 : 110} />
```
Or cleaner: CSS-driven via `w-20 sm:w-28` on the wrapper.

---

## Settings Page Section (new card, after Weather)

```
Clock
──────────────────────────────────────────────────
Show clock widget                        [ ON  ]

Style        [ Digital ]  [ Analog ]  [ Minimal ]
Color        [ ● Purple ] [ ● Blue ] [ ● Amber ] [ ● Emerald ] [ ● Rose ] [ ● Slate ]
Show seconds                             [ ON  ]
24-hour format                           [ ON  ]

Clock 1
  Label     [ Local               ]
  Timezone  [ Asia/Jerusalem (auto-detected) ▾ ]   [ ON  ]

Clock 2
  Label     [ New York            ]
  Timezone  [ America/New_York ▾  ]                [ OFF ]

Clock 3
  Label     [ Tokyo               ]
  Timezone  [ Asia/Tokyo ▾        ]                [ OFF ]
```

---

## Implementation Order

1. `worldCities.ts` — static data, no logic
2. Extend `settings.types.ts` + `SettingsContext.tsx` with `ClockSettings` defaults
3. `SingleClock.tsx` — tick logic + all three render styles
4. `ClockWidget.tsx` — reads settings, renders active clocks
5. Wire into `DashboardPage.tsx` — one line beside `WeatherWidget`
6. Settings section in `SettingsPage.tsx`
7. Test mobile layout

---

## What Makes It Load Instantly

- State initialized with `() => new Date()` — first render already correct
- Zero API calls — no network wait, no spinner
- System timezone from `Intl` — synchronous, one line
- `react-clock` is ~1.6KB gzipped — negligible
- Framer Motion already loaded by the app — no extra cost
- Static city list is a const — no import overhead

# Daily Log Feature — Technical Documentation

## Overview

The Daily Log is a work journaling system integrated into the calendar app at the `/daily-log` route. Users can record what they worked on each day (project, categories, description, technologies, team info), view analytics over time, manage log history, and customise the schema of available options.

It was adapted from the standalone `daily-work-logger-main` app and fully migrated from Firebase Firestore to the Turso (libSQL/SQLite) database shared by the rest of the calendar app.

---

## Architecture

```
/daily-log (route)
│
├── DailyLogPage.tsx        ← root; wraps AppProvider + handles view switching
│   ├── LogEntryPage        ← 'log' view  — form to log today's work
│   ├── DashboardPage       ← 'analyst' view — charts and stats
│   ├── LogsPage            ← 'logs' view — filterable history
│   └── SchemaManagerPage   ← 'settings' view — manage projects/categories/techs
│
├── context/AppContext.tsx  ← global state (entries, schema, prefs) via useReducer
├── services/
│   ├── storageService.ts   ← REST API calls to /api/worklog/*
│   └── exportService.ts    ← client-side CSV / JSON download
├── hooks/
│   ├── useLogEntry.ts      ← form state + submit logic
│   ├── useDashboard.ts     ← derived analytics (all useMemo)
│   └── useToast.ts         ← toast notification queue
└── ui/                     ← shared styled components (Button, Card, Input…)
```

---

## Data Model

### `worklog_entries` table

| Column            | Type    | Description                                          |
|-------------------|---------|------------------------------------------------------|
| id                | TEXT PK | UUID (client-generated or server-generated)          |
| date              | TEXT    | ISO date string `YYYY-MM-DD`                         |
| day_number        | INTEGER | Ordinal day count (user-tracked, starts at 1)        |
| project           | TEXT    | Project name from schema.projects                    |
| categories        | TEXT    | JSON array of category labels                        |
| title             | TEXT    | Short work task title                                |
| description       | TEXT    | Longer free-text description                         |
| technologies      | TEXT    | JSON array of `{ tech, subTechs[] }` objects         |
| team_type         | TEXT    | `'solo'` or `'team'`                                 |
| team_size         | INTEGER | Number of team members (null if solo)                |
| coding_languages  | TEXT    | JSON array of coding language strings                |
| created_at        | TEXT    | ISO datetime of insertion                            |
| deleted_at        | TEXT    | `NULL` = active; ISO 8601 = soft-deleted (in Trash)  |

**Indexes:**
- `idx_worklog_entries_date` on `(date DESC, created_at DESC)` — used by the list GET
- `idx_worklog_entries_project` on `(project)` — used by per-project filters

### `worklog_schema` table

Single JSON document (id=`'default'`) containing:
```json
{
  "projects": ["Study", "Weekeye"],
  "categories": ["bug fix", "feature", "research", ...],
  "projectInfos": {},
  "technologies": [
    { "name": "Python", "group": "languages", "subTechs": ["FastAPI", ...] },
    ...
  ]
}
```

### `worklog_preferences` table

Single JSON document (id=`'default'`) — free-form UI preferences (e.g. last-used project).

---

## API Endpoints

All endpoints are Vercel serverless functions under `api/worklog/`.

| Method | Path                          | Description                                        |
|--------|-------------------------------|----------------------------------------------------|
| GET    | `/api/worklog/entries`        | List all entries, ordered `date DESC`              |
| POST   | `/api/worklog/entries`        | Create entry; body must include `title`; returns 201 |
| DELETE | `/api/worklog/entries`        | Hard-delete ALL entries (used by "Clear All Data") |
| GET    | `/api/worklog/entries/:id`    | Get single entry by ID; 404 if not found           |
| PUT    | `/api/worklog/entries/:id`    | Full-replace update; returns updated entry         |
| DELETE | `/api/worklog/entries/:id`    | Soft-delete: sets `deleted_at`, inserts into `trash`; returns 204 |
| GET    | `/api/worklog/schema`         | Get schema JSON document; null if not seeded       |
| PUT    | `/api/worklog/schema`         | Upsert schema document                             |
| GET    | `/api/worklog/preferences`    | Get preferences; null if never saved               |
| PUT    | `/api/worklog/preferences`    | Upsert preferences document                        |
| GET    | `/api/worklog/export?format=csv`  | Download all entries as CSV (server-side)      |
| GET    | `/api/worklog/export?format=json` | Download schema as JSON (server-side)          |

---

## Data Flow

### On page load (`/daily-log`)

```
DailyLogPage mounts
  └── AppProvider mounts
        └── useEffect → init()
              ├── [sync] check sessionStorage for cached data
              │     └── if found → dispatch INIT immediately (zero latency, instant render)
              └── [async] storage.loadAll()
                    ├── GET /api/worklog/entries    (returns Entry[] — deleted_at IS NULL only)
                    ├── GET /api/worklog/schema     (returns Schema | null)
                    └── GET /api/worklog/preferences (returns Preferences | null)
                          └── dispatch INIT → updates state with fresh data
                                └── write fresh data to sessionStorage for next visit
                                └── if no schema → PUT /api/worklog/schema (defaultSchema)
```

The page renders immediately with `defaultSchema` + empty entries (or cached data from the previous visit). Network data fills in silently in the background.

### Submitting a log entry

```
User fills form → clicks "Submit Day"
  └── useLogEntry.submit()
        ├── validates: project + at least 1 task with title
        ├── builds Entry[] objects (one per task)
        └── AppContext.addEntries(entries)
              ├── optimistic: dispatch SET_ENTRIES (UI updates immediately)
              └── Promise.all: POST /api/worklog/entries for each entry
```

### Updating an entry (in LogsPage)

```
User edits → clicks Save
  └── AppContext.updateEntry(entry)
        ├── optimistic: dispatch SET_ENTRIES (replaces entry in local array)
        └── PUT /api/worklog/entries/:id
```

### Deleting an entry

```
User clicks Delete → confirms
  └── AppContext.deleteEntry(id)
        ├── optimistic: dispatch SET_ENTRIES (filters out deleted entry)
        └── DELETE /api/worklog/entries/:id
              ├── UPDATE worklog_entries SET deleted_at = now() WHERE id = ?
              └── INSERT INTO trash (id, entity_id, entity_type='worklog_entry', deleted_at)
```

The entry is **soft-deleted** — it is hidden from the Daily Log but appears in the Trash page where it can be restored or permanently deleted.

---

## Trash Integration

Deleted worklog entries appear in the global Trash page (`/trash`) alongside deleted notes and events.

### How it works

| Action | What happens |
|---|---|
| Delete entry (LogsPage) | `deleted_at` set on `worklog_entries` row; trash row inserted with `entity_type = 'worklog_entry'` |
| View Trash | `GET /api/trash` JOINs `worklog_entries` and returns them in the `worklogs[]` array |
| Restore (TrashPage) | `deleted_at` cleared on `worklog_entries`; trash row deleted — entry reappears in Daily Log |
| Delete Forever (TrashPage) | `worklog_entries` row permanently deleted; trash row deleted |
| Empty Trash | All soft-deleted worklog entries hard-deleted along with notes and events |

### Frontend

- `TrashPage.tsx` has a **Work Logs** section showing each trashed entry's title, date, project, and deletion date
- Restore/delete actions update local state immediately for instant UI feedback
- Bulk select and "Empty Trash" include worklog entries

---

## View Switching

View state is managed locally in `DailyLogInner` — it is **not** reflected in the URL. This keeps the router clean and avoids back-button complications for what is effectively an in-page tab switch.

```
type View = 'log' | 'analyst' | 'logs' | 'settings'
```

The three icon buttons in the TopBar switch the active view. Clicking the BookOpen icon / page title returns to `'log'`.

---

## Styling

The Daily Log subtree uses **Emotion CSS-in-JS** (`@emotion/styled`) for all component styling. This was preserved from the original `daily-work-logger-main` app to avoid a full rewrite.

- Emotion is scoped to the `DailyLog` subtree — it does **not** affect or conflict with Tailwind elsewhere in the app.
- The `theme/` directory contains design tokens (colors, spacing, typography, breakpoints, transitions, shadows).
- No global styles are injected, so Tailwind's base reset remains untouched.

---

## Export Feature

Two export methods are available:

| Method     | Where triggered     | Output                          |
|------------|--------------------|---------------------------------|
| Client-side CSV  | DashboardPage → Export CSV  | `worklog_YYYY-MM-DD.csv` |
| Client-side JSON | DashboardPage → Export JSON | `worklog_schema.json`    |
| Server-side CSV  | `GET /api/worklog/export?format=csv`  | Same CSV via API |
| Server-side JSON | `GET /api/worklog/export?format=json` | Same JSON via API |

Client-side exports use `exportService.ts` which builds a Blob and triggers a download without a network request.

---

## Schema Management

The Schema Manager (`/daily-log` → Settings icon) lets users customise the options that appear in the log entry form:

- **Projects** — add/remove project names; attach optional project descriptions
- **Categories** — add/remove category labels (e.g. "feature", "bug fix", "research")
- **Technologies** — add/remove tech entries with sub-technology lists; grouped by domain (languages, data_engineering, cloud_and_platforms)

All changes are persisted immediately via `AppContext.updateSchema()` → `PUT /api/worklog/schema`.

A "Reset to Defaults" button restores the bundled `defaultSchema` (which includes the full user-provided technology list seeded from their CSV export).

---

## Diagnostics / Testing

The Dashboard page (`/dashboard`) includes a **DiagnosticsPanel** with a "Test All CRUD" button that covers the worklog feature in Groups 4–6:

- **Group 4 — WorkLog**: Creates a test entry → verifies in list → reads single → updates → deletes → verifies gone
- **Group 5 — WorkLog Schema**: GET schema → round-trip PUT (adds `__DIAG__` project, then restores original)
- **Group 6 — WorkLog Prefs**: GET prefs → round-trip PUT (adds `__diagTest: true`, then restores)

The "DB Counts" button also shows the current `worklog_entries` row count alongside Events, Notes, Todos, and Trash.

---

## Performance Notes

- **Instant page load**: `AppContext` starts with `isLoading: false` and renders the page immediately with `defaultSchema` + empty entries. Data arrives from the API in the background and fills in silently.
- **sessionStorage cache**: After the first successful load, data is cached in `sessionStorage` under `dailylog_cache`. On subsequent visits within the same browser session the page hydrates from cache synchronously (zero network latency) and then refreshes in the background.
- **DB indexes**: `idx_worklog_entries_date` and `idx_worklog_entries_project` ensure all common queries are O(log n) rather than full table scans.
- **Parallel loading**: `storage.loadAll()` fires all 3 GETs simultaneously via `Promise.all`.
- **Optimistic updates**: All mutations update local state immediately so the UI never waits for the API.
- **Memoization**: `useDashboard()` uses `useMemo` for all derived analytics — no recomputation unless entries or the project filter changes.
- **Singleton DB client**: `lib/db.ts` uses a module-level singleton so Turso connections are reused across serverless function invocations within the same cold start.

---

## Seed Data

Five real worklog entries are seeded into the DB by `ensureInit()` (idempotent — `INSERT OR IGNORE`):

| Date       | Project | Title                                      |
|------------|---------|---------------------------------------------|
| 2026-02-18 | Study   | FastAPI-mongo-sql-redis-kafka on openshift  |
| 2026-02-23 | Study   | Image Text Pipeline — OCR to Elasticsearch |
| 2026-02-24 | Study   | elastic search pipeline                    |
| 2026-03-01 | Study   | podcast data pipeline                      |
| 2026-03-02 | Weekeye | configuration and familiarising with codebase |

These entries originate from the user's real CSV export from `daily-work-logger-main`.

# Next Session — Feature Roadmap
claude --dangerously-skip-permissions
no
Each step must be implemented and pushed as a **separate commit**.

---

## 1 — Trash Bin

**Location:** Sidebar, above Settings.

**Icon:** Trash bin (e.g. `Trash2` from lucide-react).

### Behavior
- Deleted notes and events are **not hard-deleted** from the DB — they stay in their existing tables but get a `deleted_at` timestamp (or `is_deleted` boolean column).
- A separate `trash` table holds only the `entity_id` + `entity_type` (`note` | `event`) for quick lookup — no duplicated data.
- Deleted items are **filtered out** of the main Notes and Events pages.
- The Trash page shows items **grouped by category**: Notes section, Events section.

### Trash Page UI
- Each item shows its title, original folder (if any), and deletion date.
- Two action buttons per item:
  - **Restore** — removes from trash, clears `deleted_at`, item reappears in its original page.
  - **Delete Permanently** — removes from trash table AND hard-deletes from the source table.
- **Empty Trash** button at the top to permanently delete everything at once.
- Multi-select (checkboxes) with bulk Restore and bulk Delete Permanently — same pattern as Notes/Events pages.

### DB changes needed
- `ALTER TABLE notes ADD COLUMN deleted_at TEXT` (try-catch, idempotent)
- `ALTER TABLE events ADD COLUMN deleted_at TEXT` (try-catch, idempotent)
- New `trash` table:
  ```sql
  CREATE TABLE IF NOT EXISTS trash (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,  -- 'note' | 'event'
    deleted_at TEXT NOT NULL
  )
  ```
- All existing `DELETE` calls become soft-deletes: set `deleted_at = NOW()` + insert into `trash`.
- GET /api/notes and GET /api/events must filter `WHERE deleted_at IS NULL`.
- New endpoints: `GET /api/trash`, `POST /api/trash/:id/restore`, `DELETE /api/trash/:id` (permanent), `DELETE /api/trash` (empty all).

---

## 2 — Gradient Action Button Component

Replace all primary action buttons (New Note, New Event, Save, Create Folder, etc.) with a shared `GradientButton` component.

### Design spec
- Base: dark background matching app scheme (`#0f172a` / slate-900 area).
- On hover: animated sweep gradient using our color scheme:
  - From left to right: `transparent → indigo-500/50 → purple-500/40 → transparent`
  - (replaces the green from the reference — use our indigo/purple palette instead)
- Slight `scale(1.05)` on hover.
- Text sits above the gradient layer (`z-index` stacking via `relative`/`absolute`).
- Smooth sweep animation: gradient `::before` pseudo-element slides from `left: -100%` to `left: 0` on hover, reverses on mouse-out with a slight delay.

### Reference component (adapt colors only)
```jsx
// Reference uses green — replace with indigo/purple gradient:
// background: linear-gradient(
//   to right,
//   transparent 0%,
//   transparent 20%,
//   rgba(99, 102, 241, 0.5) 50%,   ← indigo-500
//   rgba(168, 85, 247, 0.4) 65%,   ← purple-500
//   transparent 80%,
//   transparent 100%
// )
```

### Implementation
- Create `frontend/src/shared/components/ui/GradientButton.tsx`.
- Props: `text`, `onClick`, `icon?` (lucide icon component), `disabled?`, `className?`.
- Use Tailwind where possible; CSS-in-JS (`style jsx` / inline `<style>`) for the `::before` animation since Tailwind can't express pseudo-element keyframe sweeps.
- Replace usages: "New Note" button in NotesList, "New Event" button in EventsList, "Save Event" / "Save Changes" in EventFormPanel, folder create buttons.

---

## 3 — Todo / Task Editor

**Source spec:** `docs/task-editor-spec.md`

Build a Todo section — a checklist view where each item has a **rocket launch** completion button with animation + confetti.

### UI layout
- Todo items displayed as a vertical checklist list.
- Each item row:
  - Checkbox (standard, marks item done visually but does NOT remove it).
  - Item text.
  - **Rocket button** (right side) — clicking triggers completion sequence:
    1. Rocket icon shakes for 0.5 s (shake keyframe).
    2. Rocket flies off screen (translate + rotate, 1 s, starts at 0.5 s).
    3. Item fades/slides out of the list.
    4. Confetti fires for ~3 s then stops (`recycle={false}`).

### Animations (implement with Tailwind + CSS keyframes, NOT `@emotion/react`)
Convert the reference `@emotion/react` keyframes to standard CSS keyframes injected via a `<style>` tag or a `.css` module:

```css
@keyframes rocketShake { /* 0–100% translate/rotate as per reference */ }
@keyframes rocketFly   { 0% { transform: translate(0,0) rotate(0deg); }
                         100% { transform: translate(200px,-200px) rotate(45deg); } }
```

### Confetti
- Install `react-confetti` if not present.
- Colors: `['#FFD700', '#C0C0C0', '#6366f1', '#a855f7']` — gold, silver, indigo, purple (our palette).
- Fires full-screen, `numberOfPieces={200}`, `recycle={false}`, auto-cleans after run.
- Do **not** show a popup/overlay — just the confetti on top of the page.

### Data model
- Todos stored in their own `todos` table:
  ```sql
  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
  ```
- Completed todos are soft-hidden (can be toggled visible with a "Show completed" toggle).
- Standard CRUD endpoints: `GET /api/todos`, `POST /api/todos`, `PUT /api/todos/:id`, `DELETE /api/todos/:id`.
- Context + localStorage cache following the same optimistic pattern as Notes/Events.

### Navigation
- Add "Todos" to the sidebar and mobile nav.

---

## Commit order

1. `feat: add soft-delete trash bin (DB + API + UI)`
2. `feat: add GradientButton component and replace primary buttons`
3. `feat: add Todos page with rocket animation and confetti`
ic
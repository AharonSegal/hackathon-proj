/**
 * Dashboard/components/DiagnosticsPanel.tsx
 * -------------------------------------------
 * Developer diagnostics panel shown on the Dashboard page.
 *
 * "DB Counts"     — fires parallel GET requests to every entity endpoint and
 *                   displays the live row count + total round-trip latency.
 *                   Covers: Events, Notes, Todos, Trash, WorkLog Entries.
 *
 * "Test All CRUD" — runs a sequential CREATE → READ → UPDATE → DELETE cycle
 *                   for every entity group:
 *   Group 1 — Events    (soft-delete via Trash, restore, then permanent delete)
 *   Group 2 — Notes     (soft-delete via Trash, then permanent delete)
 *   Group 3 — Todos     (hard-delete, no trash)
 *   Group 4 — WorkLog   (hard-delete, no trash; tests entry CRUD)
 *   Group 5 — WorkLog Schema    (GET then round-trip PUT with restore)
 *   Group 6 — WorkLog Prefs     (GET then round-trip PUT with restore)
 *
 * Each step records: group, step name, status (ok/fail/skip), detail string,
 * and round-trip latency in ms.
 */

import { useCallback, useState } from 'react';
import { RefreshCw, XCircle, CheckCircle2, FlaskConical, Trash2, Database } from 'lucide-react';
import { useBackendStatus } from '@/shared/hooks/useBackendStatus';
import axios from 'axios';

// ── Types ─────────────────────────────────────────────────────────────────────

type StepStatus = 'ok' | 'fail' | 'skip';

interface CrudStep {
  group: string;
  step: string;
  status: StepStatus;
  detail: string;
  ms?: number;
}

interface DiagCounts {
  events: number;
  notes: number;
  todos: number;
  trashNotes: number;
  trashEvents: number;
  worklogEntries: number;
  latencyMs: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtErr(e: unknown): string {
  if (axios.isAxiosError(e)) {
    if (e.response) return `HTTP ${e.response.status}: ${JSON.stringify(e.response.data)}`;
    return e.message;
  }
  return String(e);
}

function StatusIcon({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
    : <XCircle      size={13} className="text-rose-400    shrink-0" />;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DiagnosticsPanel() {
  const { status } = useBackendStatus();

  // ── diagnostics state ──
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagData,    setDiagData]    = useState<DiagCounts | null>(null);
  const [diagErr,     setDiagErr]     = useState<string | null>(null);

  // ── CRUD test state ──
  const [crudRunning, setCrudRunning] = useState(false);
  const [crudLogs,    setCrudLogs]    = useState<CrudStep[]>([]);

  // ── Run diagnostics ───────────────────────────────────────────────────────

  const runDiag = useCallback(async () => {
    setDiagLoading(true);
    setDiagErr(null);
    setDiagData(null);
    const t0 = Date.now();
    try {
      const [eventsRes, notesRes, todosRes, trashRes, worklogRes] = await Promise.all([
        axios.get<{ id: string }[]>('/api/events',          { timeout: 8000 }),
        axios.get<{ id: string }[]>('/api/notes',           { timeout: 8000 }),
        axios.get<{ id: string }[]>('/api/todos',           { timeout: 8000 }),
        axios.get<{ notes: unknown[]; events: unknown[] }>('/api/trash', { timeout: 8000 }),
        axios.get<{ id: string }[]>('/api/worklog/entries', { timeout: 8000 }),
      ]);
      setDiagData({
        events:         eventsRes.data.length,
        notes:          notesRes.data.length,
        todos:          todosRes.data.length,
        trashNotes:     trashRes.data.notes.length,
        trashEvents:    trashRes.data.events.length,
        worklogEntries: worklogRes.data.length,
        latencyMs:      Date.now() - t0,
      });
    } catch (e) {
      setDiagErr(fmtErr(e));
    } finally {
      setDiagLoading(false);
    }
  }, []);

  // ── Run full CRUD test ────────────────────────────────────────────────────

  const runCrud = useCallback(async () => {
    setCrudRunning(true);
    const log: CrudStep[] = [];

    const push = (group: string, step: string, status: StepStatus, detail: string, ms?: number) => {
      log.push({ group, step, status, detail, ms });
      setCrudLogs([...log]);
    };

    // ════════════════════════════════════════════════════════════════════════
    // GROUP 1 — EVENTS
    // ════════════════════════════════════════════════════════════════════════

    const G1 = 'Events';
    const evTitle  = `[TEST] Event @ ${new Date().toISOString()}`;
    const evTitle2 = evTitle + ' — UPDATED ✓';
    const evDate   = new Date().toISOString().slice(0, 10);
    let evId: string | null = null;
    let evTrashId: string | null = null;

    // 1. CREATE
    try {
      const t0  = Date.now();
      const res = await axios.post('/api/events', { title: evTitle, date: evDate, color: 'rose', allDay: true }, { timeout: 10000 });
      evId = res.data?.id ?? null;
      push(G1, 'CREATE', res.status === 201 && evId ? 'ok' : 'fail',
        `POST /api/events → ${res.status}  id=${evId}`, Date.now() - t0);
    } catch (e) { push(G1, 'CREATE', 'fail', fmtErr(e)); }

    // 2. READ
    if (evId) try {
      const t0  = Date.now();
      const res = await axios.get<{ id: string }[]>('/api/events', { timeout: 10000 });
      const found = res.data.find(ev => ev.id === evId);
      push(G1, 'READ', found ? 'ok' : 'fail',
        found ? `GET /api/events → found (${res.data.length} total)` : `NOT found in ${res.data.length} events`,
        Date.now() - t0);
    } catch (e) { push(G1, 'READ', 'fail', fmtErr(e)); }

    // 3. UPDATE
    if (evId) try {
      const t0  = Date.now();
      const res = await axios.put(`/api/events/${evId}`, { title: evTitle2, color: 'emerald' }, { timeout: 10000 });
      const ok  = res.data?.title === evTitle2 && res.data?.color === 'emerald';
      push(G1, 'UPDATE', ok ? 'ok' : 'fail',
        `PUT /api/events/${evId} → title ${res.data?.title === evTitle2 ? '✓' : '✗'}  color ${res.data?.color === 'emerald' ? '✓' : '✗'}`,
        Date.now() - t0);
    } catch (e) { push(G1, 'UPDATE', 'fail', fmtErr(e)); }

    // 4. SOFT DELETE
    if (evId) try {
      const t0  = Date.now();
      const res = await axios.delete(`/api/events/${evId}`, { timeout: 10000 });
      push(G1, 'SOFT DELETE', res.status === 204 ? 'ok' : 'fail',
        `DELETE /api/events/${evId} → ${res.status}`, Date.now() - t0);
    } catch (e) { push(G1, 'SOFT DELETE', 'fail', fmtErr(e)); }

    // 5. VERIFY IN TRASH
    if (evId) try {
      const t0  = Date.now();
      const res = await axios.get<{ notes: unknown[]; events: { trashId: string; entityId: string }[] }>('/api/trash', { timeout: 10000 });
      const entry = res.data.events.find(e => e.entityId === evId);
      evTrashId = entry?.trashId ?? null;
      push(G1, 'IN TRASH', entry ? 'ok' : 'fail',
        entry ? `GET /api/trash → found in trash.events  trashId=${evTrashId}` : `NOT found in trash (${res.data.events.length} event entries)`,
        Date.now() - t0);
    } catch (e) { push(G1, 'IN TRASH', 'fail', fmtErr(e)); }

    // 6. RESTORE
    if (evTrashId) try {
      const t0  = Date.now();
      const res = await axios.put(`/api/trash/${evTrashId}`, {}, { timeout: 10000 });
      push(G1, 'RESTORE', res.status === 204 ? 'ok' : 'fail',
        `PUT /api/trash/${evTrashId} → ${res.status}`, Date.now() - t0);
    } catch (e) { push(G1, 'RESTORE', 'fail', fmtErr(e)); }

    // 7. VERIFY RESTORED
    if (evId && evTrashId) try {
      const t0  = Date.now();
      const res = await axios.get<{ id: string }[]>('/api/events', { timeout: 10000 });
      const found = res.data.find(e => e.id === evId);
      push(G1, 'VERIFY RESTORE', found ? 'ok' : 'fail',
        found ? `Back in events list after restore` : `NOT found after restore`, Date.now() - t0);
    } catch (e) { push(G1, 'VERIFY RESTORE', 'fail', fmtErr(e)); }

    // 8. SOFT DELETE AGAIN (to perm delete via trash)
    evTrashId = null;
    if (evId) try {
      await axios.delete(`/api/events/${evId}`, { timeout: 10000 });
      const trashRes = await axios.get<{ events: { trashId: string; entityId: string }[] }>('/api/trash', { timeout: 10000 });
      const entry = trashRes.data.events.find(e => e.entityId === evId);
      evTrashId = entry?.trashId ?? null;
      push(G1, 'DELETE AGAIN', evTrashId ? 'ok' : 'fail',
        evTrashId ? `Re-deleted; trashId=${evTrashId}` : `Deleted but not found in trash`);
    } catch (e) { push(G1, 'DELETE AGAIN', 'fail', fmtErr(e)); }

    // 9. PERMANENT DELETE via trash
    if (evTrashId) try {
      const t0  = Date.now();
      const res = await axios.delete(`/api/trash/${evTrashId}`, { timeout: 10000 });
      push(G1, 'PERM DELETE', res.status === 204 ? 'ok' : 'fail',
        `DELETE /api/trash/${evTrashId} → ${res.status}`, Date.now() - t0);
    } catch (e) { push(G1, 'PERM DELETE', 'fail', fmtErr(e)); }

    // 10. VERIFY GONE (from events and trash)
    if (evId) try {
      const t0 = Date.now();
      const [evRes, trashRes2] = await Promise.all([
        axios.get<{ id: string }[]>('/api/events', { timeout: 10000 }),
        axios.get<{ events: { entityId: string }[] }>('/api/trash', { timeout: 10000 }),
      ]);
      const inEvents = evRes.data.some(e => e.id === evId);
      const inTrash  = trashRes2.data.events.some(e => e.entityId === evId);
      push(G1, 'VERIFY GONE', !inEvents && !inTrash ? 'ok' : 'fail',
        `events list ${inEvents ? '❌ still present' : '✓ gone'}  trash ${inTrash ? '❌ still present' : '✓ gone'}`,
        Date.now() - t0);
    } catch (e) { push(G1, 'VERIFY GONE', 'fail', fmtErr(e)); }

    // ════════════════════════════════════════════════════════════════════════
    // GROUP 2 — NOTES
    // ════════════════════════════════════════════════════════════════════════

    const G2 = 'Notes';
    const nTitle  = `[TEST] Note @ ${new Date().toISOString()}`;
    const nTitle2 = nTitle + ' — UPDATED ✓';
    let nId: string | null = null;
    let nTrashId: string | null = null;

    // 11. CREATE
    try {
      const t0  = Date.now();
      const res = await axios.post('/api/notes', { title: nTitle, content: '[]', tags: [], pinned: false }, { timeout: 10000 });
      nId = res.data?.id ?? null;
      push(G2, 'CREATE', res.status === 201 && nId ? 'ok' : 'fail',
        `POST /api/notes → ${res.status}  id=${nId}`, Date.now() - t0);
    } catch (e) { push(G2, 'CREATE', 'fail', fmtErr(e)); }

    // 12. READ
    if (nId) try {
      const t0  = Date.now();
      const res = await axios.get<{ id: string }[]>('/api/notes', { timeout: 10000 });
      const found = res.data.find(n => n.id === nId);
      push(G2, 'READ', found ? 'ok' : 'fail',
        found ? `GET /api/notes → found (${res.data.length} total)` : `NOT found in ${res.data.length} notes`,
        Date.now() - t0);
    } catch (e) { push(G2, 'READ', 'fail', fmtErr(e)); }

    // 13. UPDATE
    if (nId) try {
      const t0  = Date.now();
      const res = await axios.put(`/api/notes/${nId}`, { title: nTitle2 }, { timeout: 10000 });
      const ok  = res.data?.title === nTitle2;
      push(G2, 'UPDATE', ok ? 'ok' : 'fail',
        `PUT /api/notes/${nId} → title ${ok ? '✓' : `✗ got "${res.data?.title}"`}`,
        Date.now() - t0);
    } catch (e) { push(G2, 'UPDATE', 'fail', fmtErr(e)); }

    // 14. SOFT DELETE
    if (nId) try {
      const t0  = Date.now();
      const res = await axios.delete(`/api/notes/${nId}`, { timeout: 10000 });
      push(G2, 'SOFT DELETE', res.status === 204 ? 'ok' : 'fail',
        `DELETE /api/notes/${nId} → ${res.status}`, Date.now() - t0);
    } catch (e) { push(G2, 'SOFT DELETE', 'fail', fmtErr(e)); }

    // 15. VERIFY IN TRASH
    if (nId) try {
      const t0  = Date.now();
      const res = await axios.get<{ notes: { trashId: string; entityId: string }[]; events: unknown[] }>('/api/trash', { timeout: 10000 });
      const entry = res.data.notes.find(n => n.entityId === nId);
      nTrashId = entry?.trashId ?? null;
      push(G2, 'IN TRASH', entry ? 'ok' : 'fail',
        entry ? `GET /api/trash → found in trash.notes  trashId=${nTrashId}` : `NOT found in trash (${res.data.notes.length} note entries)`,
        Date.now() - t0);
    } catch (e) { push(G2, 'IN TRASH', 'fail', fmtErr(e)); }

    // 16. PERMANENT DELETE
    if (nTrashId) try {
      const t0  = Date.now();
      const res = await axios.delete(`/api/trash/${nTrashId}`, { timeout: 10000 });
      push(G2, 'PERM DELETE', res.status === 204 ? 'ok' : 'fail',
        `DELETE /api/trash/${nTrashId} → ${res.status}`, Date.now() - t0);
    } catch (e) { push(G2, 'PERM DELETE', 'fail', fmtErr(e)); }

    // 17. VERIFY GONE
    if (nId) try {
      const t0  = Date.now();
      const res = await axios.get<{ id: string }[]>('/api/notes', { timeout: 10000 });
      const inList = res.data.some(n => n.id === nId);
      push(G2, 'VERIFY GONE', !inList ? 'ok' : 'fail',
        inList ? `❌ Note still appears in /api/notes` : `✓ Gone from notes list`,
        Date.now() - t0);
    } catch (e) { push(G2, 'VERIFY GONE', 'fail', fmtErr(e)); }

    // ════════════════════════════════════════════════════════════════════════
    // GROUP 3 — TODOS
    // ════════════════════════════════════════════════════════════════════════

    const G3 = 'Todos';
    const tdTitle  = `[TEST] Todo @ ${new Date().toISOString()}`;
    const tdTitle2 = tdTitle + ' — UPDATED ✓';
    let tdId: string | null = null;

    // 18. CREATE
    try {
      const t0  = Date.now();
      const res = await axios.post('/api/todos', { title: tdTitle }, { timeout: 10000 });
      tdId = res.data?.id ?? null;
      push(G3, 'CREATE', res.status === 201 && tdId ? 'ok' : 'fail',
        `POST /api/todos → ${res.status}  id=${tdId}`, Date.now() - t0);
    } catch (e) { push(G3, 'CREATE', 'fail', fmtErr(e)); }

    // 19. READ
    if (tdId) try {
      const t0  = Date.now();
      const res = await axios.get<{ id: string }[]>('/api/todos', { timeout: 10000 });
      const found = res.data.find(t => t.id === tdId);
      push(G3, 'READ', found ? 'ok' : 'fail',
        found ? `GET /api/todos → found (${res.data.length} total)` : `NOT found in ${res.data.length} todos`,
        Date.now() - t0);
    } catch (e) { push(G3, 'READ', 'fail', fmtErr(e)); }

    // 20. UPDATE title
    if (tdId) try {
      const t0  = Date.now();
      const res = await axios.put(`/api/todos/${tdId}`, { title: tdTitle2 }, { timeout: 10000 });
      const ok  = res.data?.title === tdTitle2;
      push(G3, 'UPDATE TITLE', ok ? 'ok' : 'fail',
        `PUT /api/todos/${tdId} → title ${ok ? '✓' : `✗ got "${res.data?.title}"`}`,
        Date.now() - t0);
    } catch (e) { push(G3, 'UPDATE TITLE', 'fail', fmtErr(e)); }

    // 21. COMPLETE
    if (tdId) try {
      const t0  = Date.now();
      const now = new Date().toISOString();
      const res = await axios.put(`/api/todos/${tdId}`, { completed: true, completedAt: now }, { timeout: 10000 });
      const ok  = res.data?.completed === true;
      push(G3, 'COMPLETE', ok ? 'ok' : 'fail',
        `PUT /api/todos/${tdId} completed → ${ok ? '✓ completed=true' : `✗ completed=${res.data?.completed}`}`,
        Date.now() - t0);
    } catch (e) { push(G3, 'COMPLETE', 'fail', fmtErr(e)); }

    // 22. DELETE
    if (tdId) try {
      const t0  = Date.now();
      const res = await axios.delete(`/api/todos/${tdId}`, { timeout: 10000 });
      push(G3, 'DELETE', res.status === 204 ? 'ok' : 'fail',
        `DELETE /api/todos/${tdId} → ${res.status}`, Date.now() - t0);
    } catch (e) { push(G3, 'DELETE', 'fail', fmtErr(e)); }

    // 23. VERIFY GONE
    if (tdId) try {
      const t0  = Date.now();
      const res = await axios.get<{ id: string }[]>('/api/todos', { timeout: 10000 });
      const inList = res.data.some(t => t.id === tdId);
      push(G3, 'VERIFY GONE', !inList ? 'ok' : 'fail',
        inList ? `❌ Todo still in list` : `✓ Gone from todos list`,
        Date.now() - t0);
    } catch (e) { push(G3, 'VERIFY GONE', 'fail', fmtErr(e)); }

    // ════════════════════════════════════════════════════════════════════════
    // GROUP 4 — WORKLOG ENTRIES (Daily Log feature)
    // ════════════════════════════════════════════════════════════════════════

    const G4 = 'WorkLog';
    const wlTitle  = `[TEST] WorkLog @ ${new Date().toISOString()}`;
    const wlTitle2 = wlTitle + ' — UPDATED ✓';
    const wlDate   = new Date().toISOString().slice(0, 10);
    let wlId: string | null = null;

    // 24. CREATE entry
    try {
      const t0  = Date.now();
      const res = await axios.post('/api/worklog/entries', {
        id:              `DIAG-WL-${Date.now()}`,
        date:            wlDate,
        dayNumber:       1,
        project:         'DiagTest',
        categories:      ['research'],
        title:           wlTitle,
        description:     'Automated CRUD diagnostic',
        technologies:    [],
        teamType:        'solo',
        codingLanguages: [],
      }, { timeout: 10000 });
      wlId = res.data?.id ?? null;
      push(G4, 'CREATE', res.status === 201 && wlId ? 'ok' : 'fail',
        `POST /api/worklog/entries → ${res.status}  id=${wlId}`, Date.now() - t0);
    } catch (e) { push(G4, 'CREATE', 'fail', fmtErr(e)); }

    // 25. READ list — verify entry present
    if (wlId) try {
      const t0  = Date.now();
      const res = await axios.get<{ id: string }[]>('/api/worklog/entries', { timeout: 10000 });
      const found = res.data.find(e => e.id === wlId);
      push(G4, 'READ LIST', found ? 'ok' : 'fail',
        found ? `GET /api/worklog/entries → found (${res.data.length} total)` : `NOT found in ${res.data.length} entries`,
        Date.now() - t0);
    } catch (e) { push(G4, 'READ LIST', 'fail', fmtErr(e)); }

    // 26. READ single
    if (wlId) try {
      const t0  = Date.now();
      const res = await axios.get<{ id: string; title: string }>(`/api/worklog/entries/${wlId}`, { timeout: 10000 });
      const ok  = res.data?.id === wlId;
      push(G4, 'READ SINGLE', ok ? 'ok' : 'fail',
        `GET /api/worklog/entries/${wlId} → id ${ok ? '✓' : '✗'}`,
        Date.now() - t0);
    } catch (e) { push(G4, 'READ SINGLE', 'fail', fmtErr(e)); }

    // 27. UPDATE
    if (wlId) try {
      const t0  = Date.now();
      const res = await axios.put(`/api/worklog/entries/${wlId}`, { title: wlTitle2 }, { timeout: 10000 });
      const ok  = res.data?.title === wlTitle2;
      push(G4, 'UPDATE', ok ? 'ok' : 'fail',
        `PUT /api/worklog/entries/${wlId} → title ${ok ? '✓' : `✗ got "${res.data?.title}"`}`,
        Date.now() - t0);
    } catch (e) { push(G4, 'UPDATE', 'fail', fmtErr(e)); }

    // 28. DELETE
    if (wlId) try {
      const t0  = Date.now();
      const res = await axios.delete(`/api/worklog/entries/${wlId}`, { timeout: 10000 });
      push(G4, 'DELETE', res.status === 204 ? 'ok' : 'fail',
        `DELETE /api/worklog/entries/${wlId} → ${res.status}`, Date.now() - t0);
    } catch (e) { push(G4, 'DELETE', 'fail', fmtErr(e)); }

    // 29. VERIFY GONE
    if (wlId) try {
      const t0  = Date.now();
      const res = await axios.get<{ id: string }[]>('/api/worklog/entries', { timeout: 10000 });
      const inList = res.data.some(e => e.id === wlId);
      push(G4, 'VERIFY GONE', !inList ? 'ok' : 'fail',
        inList ? `❌ Entry still in list` : `✓ Gone from worklog entries`,
        Date.now() - t0);
    } catch (e) { push(G4, 'VERIFY GONE', 'fail', fmtErr(e)); }

    // ════════════════════════════════════════════════════════════════════════
    // GROUP 5 — WORKLOG SCHEMA
    // ════════════════════════════════════════════════════════════════════════

    const G5 = 'WorkLog Schema';

    // 30. GET schema
    let originalSchema: unknown = null;
    try {
      const t0  = Date.now();
      const res = await axios.get('/api/worklog/schema', { timeout: 10000 });
      originalSchema = res.data;
      const hasProjects = Array.isArray(res.data?.projects);
      push(G5, 'GET SCHEMA', hasProjects ? 'ok' : 'fail',
        `GET /api/worklog/schema → projects: ${JSON.stringify(res.data?.projects)?.slice(0, 60)}`,
        Date.now() - t0);
    } catch (e) { push(G5, 'GET SCHEMA', 'fail', fmtErr(e)); }

    // 31. PUT schema (round-trip: add + remove a diag project)
    if (originalSchema) try {
      const t0      = Date.now();
      const patched = { ...(originalSchema as Record<string, unknown>), projects: [...((originalSchema as { projects: string[] }).projects), '__DIAG__'] };
      const putRes  = await axios.put('/api/worklog/schema', patched, { timeout: 10000 });
      const added   = (putRes.data?.projects as string[])?.includes('__DIAG__');
      // Restore original immediately
      await axios.put('/api/worklog/schema', originalSchema, { timeout: 10000 });
      push(G5, 'PUT SCHEMA', added ? 'ok' : 'fail',
        `PUT /api/worklog/schema → __DIAG__ ${added ? '✓ added then restored' : '✗ not persisted'}`,
        Date.now() - t0);
    } catch (e) { push(G5, 'PUT SCHEMA', 'fail', fmtErr(e)); }

    // ════════════════════════════════════════════════════════════════════════
    // GROUP 6 — WORKLOG PREFERENCES
    // ════════════════════════════════════════════════════════════════════════

    const G6 = 'WorkLog Prefs';

    // 32. GET preferences
    let originalPrefs: unknown = null;
    try {
      const t0  = Date.now();
      const res = await axios.get('/api/worklog/preferences', { timeout: 10000 });
      originalPrefs = res.data ?? {};
      push(G6, 'GET PREFS', 'ok',
        `GET /api/worklog/preferences → ${JSON.stringify(res.data ?? {}).slice(0, 80)}`,
        Date.now() - t0);
    } catch (e) { push(G6, 'GET PREFS', 'fail', fmtErr(e)); }

    // 33. PUT preferences (round-trip)
    if (originalPrefs !== null) try {
      const t0      = Date.now();
      const patched = { ...(originalPrefs as Record<string, unknown>), __diagTest: true };
      const putRes  = await axios.put('/api/worklog/preferences', patched, { timeout: 10000 });
      const ok      = putRes.data?.__diagTest === true;
      // Restore original
      await axios.put('/api/worklog/preferences', originalPrefs, { timeout: 10000 });
      push(G6, 'PUT PREFS', ok ? 'ok' : 'fail',
        `PUT /api/worklog/preferences → __diagTest ${ok ? '✓ persisted then restored' : '✗ not persisted'}`,
        Date.now() - t0);
    } catch (e) { push(G6, 'PUT PREFS', 'fail', fmtErr(e)); }

    setCrudRunning(false);
  }, []);

  // ── Status dot / label ────────────────────────────────────────────────────

  const dot = status === 'online'  ? 'bg-emerald-500'
            : status === 'offline' ? 'bg-rose-500'
                                   : 'bg-amber-400 animate-pulse';
  const statusLabel = status === 'online'  ? 'Connected'
                    : status === 'offline' ? 'Offline'
                                          : 'Checking…';
  const statusColor = status === 'online'  ? 'text-emerald-400'
                    : status === 'offline' ? 'text-rose-400'
                                          : 'text-amber-400';

  // ── Summary ───────────────────────────────────────────────────────────────

  const totalSteps  = crudLogs.length;
  const failedSteps = crudLogs.filter(s => s.status === 'fail').length;
  const allOk       = totalSteps > 0 && failedSteps === 0;

  // Group labels for visual separators
  const groups = ['Events', 'Notes', 'Todos', 'WorkLog', 'WorkLog Schema', 'WorkLog Prefs'] as const;

  return (
    <div className="card space-y-4">

      {/* ── Header: status + buttons ── */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full shrink-0 ${dot}`} />
          <div>
            <p className={`text-sm font-semibold ${statusColor}`}>{statusLabel}</p>
            <p className="text-xs text-slate-500">Backend / Database</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runDiag}
            disabled={diagLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 disabled:opacity-40 transition-colors"
          >
            <Database size={12} className={diagLoading ? 'animate-pulse' : ''} />
            {diagLoading ? 'Loading…' : 'DB Counts'}
          </button>

          <button
            onClick={runCrud}
            disabled={crudRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800/60 border border-indigo-700/50 text-xs text-indigo-300 disabled:opacity-40 transition-colors"
          >
            <FlaskConical size={12} className={crudRunning ? 'animate-pulse' : ''} />
            {crudRunning ? 'Testing…' : 'Test All CRUD'}
          </button>
        </div>
      </div>

      {/* ── DB Counts ── */}
      {diagErr && (
        <div className="rounded-lg bg-rose-950/40 border border-rose-800/50 px-3 py-2 text-xs font-mono text-rose-300 break-all">
          {diagErr}
        </div>
      )}
      {diagData && (
        <div className="rounded-lg bg-slate-900/60 px-3 py-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
          {[
            ['Events',        diagData.events],
            ['Notes',         diagData.notes],
            ['Todos',         diagData.todos],
            ['Trash Notes',   diagData.trashNotes],
            ['Trash Events',  diagData.trashEvents],
            ['WorkLog',       diagData.worklogEntries],
            ['Latency',       `${diagData.latencyMs}ms`],
          ].map(([label, val]) => (
            <div key={String(label)} className="flex flex-col">
              <span className="text-slate-500">{label}</span>
              <span className="text-slate-200 font-semibold">{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── CRUD test log ── */}
      {crudLogs.length > 0 && (
        <div className="rounded-lg bg-slate-900/60 border border-slate-700/50 px-3 py-3 space-y-1">

          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Full CRUD Test Log
            </p>
            {!crudRunning && (
              <button
                onClick={() => setCrudLogs([])}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                <Trash2 size={11} /> Clear
              </button>
            )}
          </div>

          {groups.map(group => {
            const groupSteps = crudLogs.filter(s => s.group === group);
            if (groupSteps.length === 0) return null;
            const groupFails = groupSteps.filter(s => s.status === 'fail').length;
            return (
              <div key={group} className="mb-3">
                {/* Group header */}
                <div className="flex items-center gap-2 mb-1.5">
                  <StatusIcon ok={groupFails === 0 && !crudRunning} />
                  <span className={`text-[11px] font-semibold uppercase tracking-widest ${
                    groupFails > 0 ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {group}
                    {groupFails > 0 && <span className="ml-1 text-rose-400">({groupFails} failed)</span>}
                  </span>
                </div>

                {/* Steps */}
                <div className="space-y-1 pl-2">
                  {groupSteps.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs font-mono">
                      <span className={
                        s.status === 'ok'   ? 'text-emerald-400' :
                        s.status === 'fail' ? 'text-rose-400'    : 'text-slate-500'
                      }>
                        {s.status === 'ok' ? '✅' : s.status === 'fail' ? '❌' : '⏭'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className={
                          s.status === 'ok'   ? 'text-emerald-300 font-semibold' :
                          s.status === 'fail' ? 'text-rose-300 font-semibold'    :
                                               'text-slate-400 font-semibold'
                        }>
                          {s.step}
                        </span>
                        {s.ms !== undefined && (
                          <span className="text-slate-600 ml-2">{s.ms}ms</span>
                        )}
                        <p className="text-slate-500 break-all leading-snug mt-0.5">{s.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {crudRunning && (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono pt-1">
              <RefreshCw size={11} className="animate-spin text-indigo-400" />
              <span className="text-indigo-400">running…</span>
            </div>
          )}

          {!crudRunning && totalSteps > 0 && (
            <div className={`mt-2 pt-2 border-t border-slate-800 text-xs font-semibold font-mono ${
              allOk ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {allOk
                ? `✅ All ${totalSteps} steps passed — Events + Notes + Todos + WorkLog fully operational`
                : `❌ ${failedSteps} of ${totalSteps} steps failed`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

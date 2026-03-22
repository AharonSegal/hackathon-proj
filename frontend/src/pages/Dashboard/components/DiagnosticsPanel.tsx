/**
 * Dashboard/components/DiagnosticsPanel.tsx
 * -------------------------------------------
 * Developer diagnostics panel shown on the Dashboard.
 *
 * Sections:
 * 1. Live status dot + two action buttons:
 *    - "Run Diagnostics" — fetches /api/debug (env vars, DB status, counts)
 *    - "Test CRUD"       — runs a full CREATE → READ → UPDATE → DELETE cycle
 *                          against /api/events and prints a step-by-step log
 * 2. Error banner (if /api/debug unreachable)
 * 3. Debug results — DB status, env vars, server metadata
 * 4. CRUD test log — per-step status, timing, and detail
 */

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, AlertCircle, CheckCircle2, XCircle, FlaskConical, Trash2 } from 'lucide-react';
import { useBackendStatus, retryConnection } from '@/shared/hooks/useBackendStatus';
import axios from 'axios';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DebugResult {
  env: Record<string, string | null>;
  db: {
    status: string;
    ping?: unknown;
    eventsCount?: unknown;
    logsCount?: unknown;
    error?: string;
  };
  latencyMs: number;
  timestamp: string;
  node: string;
  region: string;
}

type StepStatus = 'ok' | 'fail' | 'skip';

interface CrudStep {
  step: string;
  status: StepStatus;
  detail: string;
  ms?: number;
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  const missing = !value || value === '— NOT SET —';
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-2 py-1.5 border-b border-slate-800 last:border-0">
      <span className="text-slate-500 sm:w-52 sm:shrink-0 text-xs font-mono">{label}</span>
      <span className={`text-xs font-mono break-all ${missing ? 'text-rose-400' : 'text-slate-200'}`}>
        {value ?? '— NOT SET —'}
      </span>
    </div>
  );
}

function StatusIcon({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
    : <XCircle      size={14} className="text-rose-400    shrink-0" />;
}

/** Format an Axios (or any) error into a short readable string */
function fmtErr(e: unknown): string {
  if (axios.isAxiosError(e)) {
    if (e.response) return `HTTP ${e.response.status}: ${JSON.stringify(e.response.data)}`;
    return e.message;
  }
  return String(e);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DiagnosticsPanel() {
  const { status } = useBackendStatus();

  // ── diagnostics state ──
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagData,    setDiagData]    = useState<DebugResult | null>(null);
  const [diagErr,     setDiagErr]     = useState<string | null>(null);

  // ── CRUD test state ──
  const [crudRunning, setCrudRunning] = useState(false);
  const [crudLogs,    setCrudLogs]    = useState<CrudStep[]>([]);

  // ── Run diagnostics ───────────────────────────────────────────────────────

  const runDiag = useCallback(async () => {
    setDiagLoading(true);
    setDiagErr(null);
    retryConnection();
    try {
      const res = await axios.get<DebugResult>('/api/debug', { timeout: 10000 });
      setDiagData(res.data);
    } catch (e) {
      setDiagErr(fmtErr(e));
    } finally {
      setDiagLoading(false);
    }
  }, []);

  useEffect(() => { runDiag(); }, [runDiag]);

  // ── Run CRUD test ─────────────────────────────────────────────────────────

  const runCrud = useCallback(async () => {
    setCrudRunning(true);

    // Build log incrementally so each step appears as it completes
    const log: CrudStep[] = [];
    const push = (step: string, status: StepStatus, detail: string, ms?: number) => {
      log.push({ step, status, detail, ms });
      setCrudLogs([...log]);
    };

    const testTitle   = `[CRUD-TEST] Temp event @ ${new Date().toISOString()}`;
    const updTitle    = testTitle + ' — UPDATED ✓';
    const testDate    = new Date().toISOString().slice(0, 10);
    let   createdId: string | null = null;

    // ── Step 1: CREATE ───────────────────────────────────────────────────────
    try {
      const t0  = Date.now();
      const res = await axios.post('/api/events', {
        title:  testTitle,
        date:   testDate,
        color:  'rose',
        allDay: true,
      }, { timeout: 10000 });
      const ms = Date.now() - t0;
      createdId = res.data?.id ?? null;

      if (res.status === 201 && createdId) {
        push('CREATE', 'ok',
          `POST /api/events → 201  id=${createdId}  title="${res.data.title}"`,
          ms,
        );
      } else {
        push('CREATE', 'fail',
          `Unexpected status ${res.status} or missing id in response`,
          ms,
        );
      }
    } catch (e) {
      push('CREATE', 'fail', fmtErr(e));
      setCrudRunning(false);
      return; // can't continue without an ID
    }

    // ── Step 2: READ — list all events and find the created one ──────────────
    try {
      const t0  = Date.now();
      const res = await axios.get<{ id: string; title: string }[]>('/api/events', { timeout: 10000 });
      const ms  = Date.now() - t0;
      const found = res.data.find(ev => ev.id === createdId);

      push('READ', found ? 'ok' : 'fail',
        found
          ? `GET /api/events → found event among ${res.data.length} total`
          : `GET /api/events → event NOT found in ${res.data.length} results`,
        ms,
      );
    } catch (e) {
      push('READ', 'fail', fmtErr(e));
    }

    // ── Step 3: UPDATE ───────────────────────────────────────────────────────
    try {
      const t0  = Date.now();
      const res = await axios.put(`/api/events/${createdId}`, {
        title: updTitle,
        color: 'emerald',
      }, { timeout: 10000 });
      const ms      = Date.now() - t0;
      const titleOk = res.data?.title === updTitle;
      const colorOk = res.data?.color === 'emerald';

      push('UPDATE', titleOk && colorOk ? 'ok' : 'fail',
        `PUT /api/events/${createdId} → title ${titleOk ? '✓' : '✗'}  color ${colorOk ? '✓' : '✗'}`,
        ms,
      );
    } catch (e) {
      push('UPDATE', 'fail', fmtErr(e));
    }

    // ── Step 4: VERIFY UPDATE — re-read and confirm the change persisted ─────
    try {
      const t0  = Date.now();
      const res = await axios.get<{ id: string; title: string; color: string }[]>(
        '/api/events', { timeout: 10000 },
      );
      const ms    = Date.now() - t0;
      const found = res.data.find(ev => ev.id === createdId);
      const ok    = found?.title === updTitle && found?.color === 'emerald';

      push('VERIFY UPDATE', ok ? 'ok' : 'fail',
        ok
          ? `Re-read from DB → title and color match`
          : found
            ? `Re-read mismatch — title="${found.title}" color="${found.color}"`
            : `Event not found in list after update`,
        ms,
      );
    } catch (e) {
      push('VERIFY UPDATE', 'fail', fmtErr(e));
    }

    // ── Step 5: DELETE ───────────────────────────────────────────────────────
    try {
      const t0  = Date.now();
      const res = await axios.delete(`/api/events/${createdId}`, { timeout: 10000 });
      const ms  = Date.now() - t0;

      push('DELETE', res.status === 204 ? 'ok' : 'fail',
        `DELETE /api/events/${createdId} → ${res.status}`,
        ms,
      );
    } catch (e) {
      push('DELETE', 'fail', fmtErr(e));
    }

    // ── Step 6: VERIFY GONE — PUT should now 404 ─────────────────────────────
    try {
      const t0  = Date.now();
      await axios.put(`/api/events/${createdId}`, { title: 'should-not-exist' }, { timeout: 10000 });
      const ms = Date.now() - t0;
      // If we reach here, the event still exists — that's a failure
      push('VERIFY DELETE', 'fail',
        `Expected 404 but got 200 — event still exists in the DB`,
        ms,
      );
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        push('VERIFY DELETE', 'ok', `PUT on deleted id → 404 (confirmed gone from DB)`);
      } else {
        push('VERIFY DELETE', 'fail', fmtErr(e));
      }
    }

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

  // ── Render ────────────────────────────────────────────────────────────────

  const allOk   = crudLogs.length > 0 && crudLogs.every(s => s.status === 'ok');
  const anyFail = crudLogs.some(s => s.status === 'fail');

  return (
    <div className="card space-y-4">

      {/* ── Header: status + action buttons ── */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full shrink-0 ${dot}`} />
          <div>
            <p className={`text-sm font-semibold ${statusColor}`}>{statusLabel}</p>
            <p className="text-xs text-slate-500">Backend / Database</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Run Diagnostics */}
          <button
            onClick={runDiag}
            disabled={diagLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={12} className={diagLoading ? 'animate-spin' : ''} />
            {diagLoading ? 'Running…' : 'Run Diagnostics'}
          </button>

          {/* Test CRUD */}
          <button
            onClick={runCrud}
            disabled={crudRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800/60 border border-indigo-700/50 text-xs text-indigo-300 disabled:opacity-40 transition-colors"
          >
            <FlaskConical size={12} className={crudRunning ? 'animate-pulse' : ''} />
            {crudRunning ? 'Testing…' : 'Test CRUD'}
          </button>
        </div>
      </div>

      {/* ── /api/debug error banner ── */}
      {diagErr && (
        <div className="rounded-lg bg-rose-950/40 border border-rose-800/50 px-3 py-2">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={13} className="text-rose-400" />
            <span className="text-xs font-semibold text-rose-400">Could not reach /api/debug</span>
          </div>
          <p className="text-xs font-mono text-rose-300 break-all">{diagErr}</p>
        </div>
      )}

      {/* ── /api/debug results ── */}
      {diagData && (
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-900/60 px-3 py-2 space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon ok={diagData.db.status === 'connected'} />
              <span className="text-xs font-semibold text-slate-300">
                Database — {diagData.db.status === 'connected' ? 'connected' : 'ERROR'}
              </span>
              <span className="ml-auto text-xs text-slate-500">
                {diagData.latencyMs}ms · {diagData.region} · {diagData.node}
              </span>
            </div>
            {diagData.db.status === 'connected' ? (
              <>
                <p className="text-xs font-mono text-slate-400">ping: {JSON.stringify(diagData.db.ping)}</p>
                <p className="text-xs font-mono text-slate-400">events in DB: {String(diagData.db.eventsCount)}</p>
                <p className="text-xs font-mono text-slate-400">message_logs in DB: {String(diagData.db.logsCount)}</p>
              </>
            ) : (
              <p className="text-xs font-mono text-rose-400 break-all">{diagData.db.error}</p>
            )}
          </div>

          <div className="rounded-lg bg-slate-900/60 px-3 py-2">
            <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Environment Variables</p>
            {Object.entries(diagData.env).map(([key, val]) => (
              <Row key={key} label={key} value={val} />
            ))}
          </div>

          <p className="text-xs text-slate-600 font-mono">checked at {diagData.timestamp}</p>
        </div>
      )}

      {/* ── CRUD test log ── */}
      {crudLogs.length > 0 && (
        <div className="rounded-lg bg-slate-900/60 border border-slate-700/50 px-3 py-3 space-y-2">

          {/* Log header */}
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              CRUD Test Log
            </p>
            {!crudRunning && (
              <button
                onClick={() => setCrudLogs([])}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                <Trash2 size={11} />
                Clear
              </button>
            )}
          </div>

          {/* Step rows */}
          {crudLogs.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs font-mono">
              {/* Status icon */}
              <span className={
                s.status === 'ok'   ? 'text-emerald-400' :
                s.status === 'fail' ? 'text-rose-400'    :
                                      'text-slate-500'
              }>
                {s.status === 'ok' ? '✅' : s.status === 'fail' ? '❌' : '⏭'}
              </span>

              <div className="flex-1 min-w-0">
                {/* Step name + timing */}
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
                {/* Detail */}
                <p className="text-slate-500 break-all leading-snug mt-0.5">{s.detail}</p>
              </div>
            </div>
          ))}

          {/* Running spinner row */}
          {crudRunning && (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono pt-1">
              <RefreshCw size={11} className="animate-spin text-indigo-400" />
              <span className="text-indigo-400">running next step…</span>
            </div>
          )}

          {/* Final verdict */}
          {!crudRunning && crudLogs.length > 0 && (
            <div className={`mt-2 pt-2 border-t border-slate-800 text-xs font-semibold font-mono ${
              allOk ? 'text-emerald-400' : anyFail ? 'text-rose-400' : 'text-slate-400'
            }`}>
              {allOk
                ? `✅ All ${crudLogs.length} steps passed — DB read/write/delete working`
                : `❌ ${crudLogs.filter(s => s.status === 'fail').length} of ${crudLogs.length} steps failed`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

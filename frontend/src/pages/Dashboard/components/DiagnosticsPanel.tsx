/**
 * Dashboard/components/DiagnosticsPanel.tsx
 * -------------------------------------------
 * Developer diagnostics panel shown on the Dashboard.
 *
 * Fetches /api/debug and displays:
 * - Live backend connection status (online / checking / offline)
 * - Database connection status + row counts
 * - All environment variables (sensitive values are masked server-side)
 * - Server metadata (Node version, Vercel region, latency)
 *
 * Also calls retryConnection() to re-check the backend health whenever
 * the user clicks "Run Diagnostics".
 *
 * Process Flow:
 * 1. On mount → automatically calls /api/debug
 * 2. User clicks "Run Diagnostics" → calls /api/debug again + retries health check
 * 3. Results are displayed in two sections: DB status and env vars
 */

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useBackendStatus, retryConnection } from '@/shared/hooks/useBackendStatus';
import axios from 'axios';

/** Shape of the /api/debug response */
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

/** One row in the env vars table */
function Row({ label, value }: { label: string; value: string | null | undefined }) {
  const missing = !value || value === '— NOT SET —';
  return (
    <div className="flex items-start gap-2 py-1 border-b border-slate-800 last:border-0">
      <span className="text-slate-500 w-52 shrink-0 text-xs font-mono">{label}</span>
      <span className={`text-xs font-mono break-all ${missing ? 'text-rose-400' : 'text-slate-200'}`}>
        {value ?? '— NOT SET —'}
      </span>
    </div>
  );
}

/** Green check or red X icon based on a boolean condition */
function StatusIcon({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
    : <XCircle      size={14} className="text-rose-400    shrink-0" />;
}

export function DiagnosticsPanel() {
  const { status } = useBackendStatus();
  const [loading,  setLoading]  = useState(false);
  const [data,     setData]     = useState<DebugResult | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);

  /** Fetch /api/debug and update state */
  const run = useCallback(async () => {
    setLoading(true);
    setFetchErr(null);
    retryConnection(); // also re-check the /api/health poller
    try {
      const res = await axios.get<DebugResult>('/api/debug', { timeout: 10000 });
      setData(res.data);
    } catch (e) {
      // Format the error message depending on whether we got an HTTP response or a network error
      setFetchErr(axios.isAxiosError(e)
        ? e.response
          ? `HTTP ${e.response.status}: ${JSON.stringify(e.response.data)}`
          : e.message
        : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run diagnostics once when the component mounts
  useEffect(() => { run(); }, [run]);

  // Derive visual status from the backend polling state
  const dot =
    status === 'online'  ? 'bg-emerald-500' :
    status === 'offline' ? 'bg-rose-500'    :
                           'bg-amber-400 animate-pulse';
  const statusLabel =
    status === 'online'  ? 'Connected' :
    status === 'offline' ? 'Offline'   : 'Checking…';
  const statusColor =
    status === 'online'  ? 'text-emerald-400' :
    status === 'offline' ? 'text-rose-400'    : 'text-amber-400';

  return (
    <div className="card space-y-4">
      {/* Header: live status dot + "Run Diagnostics" button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${dot}`} />
          <div>
            <p className={`text-sm font-semibold ${statusColor}`}>{statusLabel}</p>
            <p className="text-xs text-slate-500">Backend / Database</p>
          </div>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 disabled:opacity-40 transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Running…' : 'Run Diagnostics'}
        </button>
      </div>

      {/* Error banner — shown if /api/debug could not be reached */}
      {fetchErr && (
        <div className="rounded-lg bg-rose-950/40 border border-rose-800/50 px-3 py-2">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={13} className="text-rose-400" />
            <span className="text-xs font-semibold text-rose-400">Could not reach /api/debug</span>
          </div>
          <p className="text-xs font-mono text-rose-300 break-all">{fetchErr}</p>
        </div>
      )}

      {/* Results — shown after a successful fetch */}
      {data && (
        <div className="space-y-4">
          {/* DB connection status + counts */}
          <div className="rounded-lg bg-slate-900/60 px-3 py-2 space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon ok={data.db.status === 'connected'} />
              <span className="text-xs font-semibold text-slate-300">
                Database — {data.db.status === 'connected' ? 'connected' : 'ERROR'}
              </span>
              <span className="ml-auto text-xs text-slate-500">
                {data.latencyMs}ms · {data.region} · {data.node}
              </span>
            </div>
            {data.db.status === 'connected' ? (
              <>
                <p className="text-xs font-mono text-slate-400">ping: {JSON.stringify(data.db.ping)}</p>
                <p className="text-xs font-mono text-slate-400">events in DB: {String(data.db.eventsCount)}</p>
                <p className="text-xs font-mono text-slate-400">message_logs in DB: {String(data.db.logsCount)}</p>
              </>
            ) : (
              <p className="text-xs font-mono text-rose-400 break-all">{data.db.error}</p>
            )}
          </div>

          {/* Environment variables (sensitive values are masked by the API) */}
          <div className="rounded-lg bg-slate-900/60 px-3 py-2">
            <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Environment Variables</p>
            {Object.entries(data.env).map(([key, val]) => (
              <Row key={key} label={key} value={val} />
            ))}
          </div>

          <p className="text-xs text-slate-600 font-mono">checked at {data.timestamp}</p>
        </div>
      )}
    </div>
  );
}

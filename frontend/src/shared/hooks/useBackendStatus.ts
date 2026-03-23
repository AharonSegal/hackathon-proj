/**
 * shared/hooks/useBackendStatus.ts
 * ---------------------------------
 * Singleton poller that checks backend health every 30 seconds.
 *
 * Design: only ONE HTTP request is ever in flight at a time, regardless of how
 * many components call useBackendStatus(). All subscribers share the same state
 * via a module-level listener set.
 *
 * Returns BackendDetail: { status, db, latencyMs, error }
 * - status: 'checking' | 'online' | 'offline'
 * - db: 'ok' or an error string from /api/health
 *
 * Also exports retryConnection() — call this to trigger an immediate re-check
 * without waiting for the next 30-second tick.
 */

import { useState, useEffect } from 'react';
import axios from 'axios';

type Status = 'checking' | 'online' | 'offline';

export interface BackendDetail {
  status: Status;
  db?: 'ok' | string;       // 'ok' or the error message
  latencyMs?: number;
  error?: string;           // HTTP / network error
}

let globalDetail: BackendDetail = { status: 'checking' };
const listeners = new Set<(d: BackendDetail) => void>();

function notify(d: BackendDetail) {
  globalDetail = d;
  listeners.forEach(fn => fn(d));
}

const check = async () => {
  notify({ ...globalDetail, status: 'checking' });
  try {
    const res = await axios.get<{ db?: { status?: string }; latencyMs?: number }>(
      '/api/debug',
      { timeout: 8000 },
    );
    const dbStatus = res.data.db?.status;
    notify({
      status: dbStatus === 'connected' ? 'online' : 'offline',
      db: dbStatus === 'connected' ? 'ok' : (dbStatus ?? 'unknown'),
      latencyMs: res.data.latencyMs,
    });
  } catch (err) {
    const msg = axios.isAxiosError(err)
      ? err.response
        ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
        : err.message
      : String(err);
    notify({ status: 'offline', error: msg });
  }
};

let started = false;
function startPoller() {
  if (started) return;
  started = true;
  check();
  setInterval(check, 30_000);
}

export function retryConnection() {
  check();
}

export function useBackendStatus(): BackendDetail {
  const [detail, setDetail] = useState<BackendDetail>(globalDetail);

  useEffect(() => {
    listeners.add(setDetail);
    startPoller();
    return () => { listeners.delete(setDetail); };
  }, []);

  return detail;
}

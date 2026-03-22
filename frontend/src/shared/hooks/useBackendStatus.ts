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
    const res = await axios.get<{ status: string; db?: string; latencyMs?: number }>(
      '/api/health',
      { timeout: 8000 },
    );
    notify({
      status: res.data.status === 'ok' ? 'online' : 'offline',
      db: res.data.db ?? 'ok',
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

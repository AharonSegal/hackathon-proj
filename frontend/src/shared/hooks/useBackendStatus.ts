import { useState, useEffect } from 'react';
import axios from 'axios';

type Status = 'checking' | 'online' | 'offline';

let globalStatus: Status = 'checking';
const listeners = new Set<(s: Status) => void>();

function notify(s: Status) {
  globalStatus = s;
  listeners.forEach(fn => fn(s));
}

// Single shared poller — runs once regardless of how many components use the hook
let started = false;
function startPoller() {
  if (started) return;
  started = true;

  const check = async () => {
    try {
      const base = import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/api`
        : '/api';
      await axios.get(`${base}/health`, { timeout: 5000 });
      notify('online');
    } catch {
      notify('offline');
    }
  };

  check();
  setInterval(check, 30_000);
}

export function useBackendStatus(): Status {
  const [status, setStatus] = useState<Status>(globalStatus);

  useEffect(() => {
    listeners.add(setStatus);
    startPoller();
    return () => { listeners.delete(setStatus); };
  }, []);

  return status;
}

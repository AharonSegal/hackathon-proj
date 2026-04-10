/**
 * sw.js — Service Worker for browser push notifications
 *
 * Stores notification schedules in IndexedDB so they survive SW termination.
 * On each activation and SYNC_NOTIFICATIONS message, reschedules upcoming
 * notifications via setTimeout (works while SW is alive: ~30s–minutes after
 * last fetch, or permanently while a tab is open).
 */

const DB_NAME  = 'notif-store-v1';
const STORE    = 'schedule';
const ICON     = '/calendar.svg';

// ── IndexedDB helpers ────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess  = (e) => resolve(e.target.result);
    req.onerror    = ()  => reject(req.error);
  });
}

async function dbGetAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function dbPutAll(items) {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  const st = tx.objectStore(STORE);
  st.clear();
  for (const item of items) st.put(item);
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });
}

async function dbDelete(id) {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(id);
  return new Promise((resolve) => { tx.oncomplete = resolve; });
}

// ── Timer management ─────────────────────────────────────────────────────────

const timers = new Map(); // id → timeoutId

async function rescheduleAll() {
  // Cancel existing timers
  for (const [, tid] of timers) clearTimeout(tid);
  timers.clear();

  const items = await dbGetAll();
  const now   = Date.now();

  for (const n of items) {
    const delay = n.fireAt - now;

    // Only schedule if in the future and within the next 48 h
    // (SW won't realistically live longer than a few minutes without a tab,
    //  but 48 h is fine when a tab is open)
    if (delay > 0 && delay < 48 * 60 * 60 * 1000) {
      const tid = setTimeout(async () => {
        await self.registration.showNotification(n.title, {
          body:             n.body,
          icon:             ICON,
          badge:            ICON,
          tag:              n.id,
          requireInteraction: false,
        });
        await dbDelete(n.id);
        timers.delete(n.id);
      }, delay);
      timers.set(n.id, tid);
    }
  }
}

// ── SW lifecycle ─────────────────────────────────────────────────────────────

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim().then(() => rescheduleAll()));
});

// ── Message from main thread ─────────────────────────────────────────────────

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SYNC_NOTIFICATIONS') {
    e.waitUntil(
      dbPutAll(e.data.notifications).then(() => rescheduleAll())
    );
  }
});

// ── Notification click → focus / open app tab ────────────────────────────────

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return self.clients.openWindow('/');
    })
  );
});

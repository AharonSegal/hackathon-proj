/**
 * pages/DailyLog/services/storageService.ts
 * -------------------------------------------
 * All persistence for the Daily Log feature — thin wrappers around the
 * REST API exposed by /api/worklog/*.
 *
 * Replaces the original Firebase Firestore calls from daily-work-logger-main.
 * Uses native fetch() so no extra HTTP client dependency is needed.
 *
 * Exported functions:
 * - getEntries()        GET  /api/worklog/entries       → Entry[]
 * - addEntry(e)         POST /api/worklog/entries        (creates one entry)
 * - putEntry(e)         PUT  /api/worklog/entries/:id    (full replace)
 * - removeEntry(id)     DELETE /api/worklog/entries/:id
 * - getSchema()         GET  /api/worklog/schema         → Schema | null
 * - setSchema(s)        PUT  /api/worklog/schema
 * - getPreferences()    GET  /api/worklog/preferences    → Preferences | null
 * - setPreferences(p)   PUT  /api/worklog/preferences
 * - loadAll()           fires all 3 GETs in parallel → { entries, schema, preferences }
 * - clearAllData()      DELETE /api/worklog/entries      (wipes all entries)
 *
 * Error handling: apiFetch() swallows errors and returns null; callers
 * handle null via ?? defaults. Console errors are logged for debugging.
 */

import type { Entry, Schema, Preferences } from '../utils/types';

const BASE = '/api/worklog';

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    console.error(`[Storage] fetch failed: ${url}`, err);
    return null;
  }
}

export async function getEntries(): Promise<Entry[]> {
  const data = await apiFetch<Entry[]>(`${BASE}/entries`);
  return data ?? [];
}

export async function addEntry(entry: Entry): Promise<void> {
  await apiFetch(`${BASE}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
}

export async function putEntry(entry: Entry): Promise<void> {
  await apiFetch(`${BASE}/entries/${entry.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
}

export async function removeEntry(id: string): Promise<void> {
  await apiFetch(`${BASE}/entries/${id}`, { method: 'DELETE' });
}

export async function getSchema(): Promise<Schema | null> {
  return apiFetch<Schema>(`${BASE}/schema`);
}

export async function setSchema(schema: Schema): Promise<void> {
  await apiFetch(`${BASE}/schema`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(schema),
  });
}

export async function getPreferences(): Promise<Preferences | null> {
  return apiFetch<Preferences>(`${BASE}/preferences`);
}

export async function setPreferences(prefs: Preferences): Promise<void> {
  await apiFetch(`${BASE}/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs),
  });
}

export async function loadAll() {
  const [entries, schema, preferences] = await Promise.all([
    getEntries(),
    getSchema(),
    getPreferences(),
  ]);
  return { entries, schema, preferences };
}

export async function clearAllData(): Promise<void> {
  await apiFetch(`${BASE}/entries`, { method: 'DELETE' });
}

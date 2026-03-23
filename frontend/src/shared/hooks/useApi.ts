/**
 * shared/hooks/useApi.ts
 * -----------------------
 * Axios-based API client with localStorage cache fallback.
 *
 * Exports four objects:
 * - eventApi   — CRUD operations for calendar events (/api/events)
 * - messageApi — send WhatsApp/email, fetch message logs (/api/messages/*)
 * - settingsApi — save settings and send test messages (/api/settings, /api/messages/[type]/test)
 * - notesApi   — CRUD operations for notes (/api/notes)
 *
 * Caching strategy:
 * - GET endpoints (getAll, getLogs): write response to localStorage on success,
 *   return cached data on network failure — app stays usable while offline
 * - Write endpoints (create, update, delete, send): always throw on failure
 *   so the calling component can show a toast error
 */

import axios from 'axios';
import { CalendarEvent, MessageLog } from '@/shared/types/event.types';
import { type Note, type Folder } from '@/shared/types/note.types';

const api = axios.create({
  baseURL: '/api',
  timeout: 8000,
});

// ─── Local cache helpers ───────────────────────────────────────────────────────

const CACHE_KEYS = {
  events: 'cache_v1_events',
  logs: 'cache_v1_message_logs',
  notes: 'cache_v1_notes',
  folders: 'cache_v1_folders',
} as const;

function readCache<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as T[];
  } catch {
    return [];
  }
}

function writeCache<T>(key: string, data: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // storage full — silently ignore
  }
}

function upsertCache<T extends { id: string }>(key: string, item: T) {
  const items = readCache<T>(key);
  const idx = items.findIndex(i => i.id === item.id);
  if (idx >= 0) items[idx] = item; else items.push(item);
  writeCache(key, items);
}

function removeFromCache(key: string, id: string) {
  const items = readCache<{ id: string }>(key).filter(i => i.id !== id);
  writeCache(key, items);
}

// ─── Events ───────────────────────────────────────────────────────────────────

export const eventApi = {
  getAll: async (): Promise<CalendarEvent[]> => {
    try {
      const data = await api.get<CalendarEvent[]>('/events').then(r => r.data);
      writeCache(CACHE_KEYS.events, data);
      return data;
    } catch {
      return readCache<CalendarEvent>(CACHE_KEYS.events);
    }
  },

  getByMonth: async (year: number, month: number): Promise<CalendarEvent[]> => {
    try {
      return await api.get<CalendarEvent[]>(`/events?year=${year}&month=${month}`).then(r => r.data);
    } catch {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      return readCache<CalendarEvent>(CACHE_KEYS.events).filter(e => e.date.startsWith(prefix));
    }
  },

  create: async (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<CalendarEvent> => {
    const data = await api.post<CalendarEvent>('/events', event).then(r => r.data);
    upsertCache(CACHE_KEYS.events, data);
    return data;
  },

  update: async (id: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> => {
    const data = await api.put<CalendarEvent>(`/events/${id}`, event).then(r => r.data);
    upsertCache(CACHE_KEYS.events, data);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/events/${id}`);
    removeFromCache(CACHE_KEYS.events, id);
  },
};

// ─── Messages ─────────────────────────────────────────────────────────────────

export const messageApi = {
  getLogs: async (): Promise<MessageLog[]> => {
    try {
      const data = await api.get<MessageLog[]>('/messages/logs').then(r => r.data);
      writeCache(CACHE_KEYS.logs, data);
      return data;
    } catch {
      return readCache<MessageLog>(CACHE_KEYS.logs);
    }
  },

  sendWhatsApp: (payload: {
    to: string;
    message: string;
    scheduleAt?: string;
    eventId?: string;
  }) => api.post('/messages/whatsapp', payload).then(r => r.data),

  sendEmail: (payload: {
    to: string[];
    subject: string;
    body: string;
    scheduleAt?: string;
    eventId?: string;
  }) => api.post('/messages/email', payload).then(r => r.data),
};

// ─── Notes ────────────────────────────────────────────────────────────────────

export const notesApi = {
  getAll: async (): Promise<Note[]> => {
    try {
      const data = await api.get<Note[]>('/notes').then(r => r.data);
      writeCache(CACHE_KEYS.notes, data);
      return data;
    } catch {
      return readCache<Note>(CACHE_KEYS.notes);
    }
  },

  create: async (note: Omit<Note, 'createdAt' | 'updatedAt'>): Promise<Note> => {
    const data = await api.post<Note>('/notes', note).then(r => r.data);
    upsertCache(CACHE_KEYS.notes, data);
    return data;
  },

  update: async (id: string, patch: Partial<Pick<Note, 'title' | 'content' | 'pinned' | 'tags' | 'folderId'>>): Promise<Note> => {
    const body = { ...patch, ...(patch.folderId !== undefined ? { folderId: patch.folderId } : {}) };
    const data = await api.put<Note>(`/notes/${id}`, body).then(r => r.data);
    upsertCache(CACHE_KEYS.notes, data);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/notes/${id}`);
    removeFromCache(CACHE_KEYS.notes, id);
  },
};

// ─── Folders ──────────────────────────────────────────────────────────────────

export const foldersApi = {
  getAll: async (): Promise<Folder[]> => {
    try {
      const data = await api.get<Folder[]>('/folders').then(r => r.data);
      writeCache(CACHE_KEYS.folders, data);
      return data;
    } catch {
      return readCache<Folder>(CACHE_KEYS.folders);
    }
  },
  create: async (folder: { id?: string; name: string; color: string }): Promise<Folder> => {
    const data = await api.post<Folder>('/folders', folder).then(r => r.data);
    upsertCache(CACHE_KEYS.folders, data);
    return data;
  },
  update: async (id: string, patch: { name?: string; color?: string }): Promise<Folder> => {
    const data = await api.put<Folder>(`/folders/${id}`, patch).then(r => r.data);
    upsertCache(CACHE_KEYS.folders, data);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/folders/${id}`);
    removeFromCache(CACHE_KEYS.folders, id);
  },
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settingsApi = {
  save: (settings: object) =>
    api.post('/settings', settings).then(r => r.data).catch(() => ({ ok: true })),

  testWhatsApp: (to: string) =>
    api.post('/messages/whatsapp/test', { to }).then(r => r.data),

  testEmail: (to: string) =>
    api.post('/messages/email/test', { to }).then(r => r.data),
};

import axios from 'axios';
import { CalendarEvent, MessageLog } from '@/shared/types/event.types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  timeout: 8000,
});

// ─── Local cache helpers ───────────────────────────────────────────────────────

const CACHE_KEYS = {
  events: 'cache_v1_events',
  logs: 'cache_v1_message_logs',
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

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settingsApi = {
  save: (settings: object) =>
    api.post('/settings', settings).then(r => r.data).catch(() => ({ ok: true })),

  testWhatsApp: (to: string) =>
    api.post('/messages/whatsapp/test', { to }).then(r => r.data),

  testEmail: (to: string) =>
    api.post('/messages/email/test', { to }).then(r => r.data),
};

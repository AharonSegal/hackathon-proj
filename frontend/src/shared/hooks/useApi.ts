import axios from 'axios';
import { CalendarEvent, MessageLog } from '@/shared/types/event.types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
});

// ─── Events ──────────────────────────────────────────────────────────────────

export const eventApi = {
  getAll: () => api.get<CalendarEvent[]>('/events').then(r => r.data),

  getByMonth: (year: number, month: number) =>
    api.get<CalendarEvent[]>(`/events?year=${year}&month=${month}`).then(r => r.data),

  create: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<CalendarEvent>('/events', event).then(r => r.data),

  update: (id: string, event: Partial<CalendarEvent>) =>
    api.put<CalendarEvent>(`/events/${id}`, event).then(r => r.data),

  delete: (id: string) => api.delete(`/events/${id}`),
};

// ─── Messages ────────────────────────────────────────────────────────────────

export const messageApi = {
  getLogs: () => api.get<MessageLog[]>('/messages/logs').then(r => r.data),

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

// ─── Settings ────────────────────────────────────────────────────────────────

export const settingsApi = {
  save: (settings: object) => api.post('/settings', settings).then(r => r.data),
  testWhatsApp: (to: string) => api.post('/messages/whatsapp/test', { to }).then(r => r.data),
  testEmail: (to: string) => api.post('/messages/email/test', { to }).then(r => r.data),
};

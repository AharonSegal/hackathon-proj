/**
 * shared/types/event.types.ts
 * ----------------------------
 * TypeScript interfaces for the core data models.
 *
 * - CalendarEvent     — a calendar event with optional scheduled messages
 * - ScheduledEmail    — email payload attached to an event
 * - ScheduledWhatsApp — WhatsApp payload attached to an event
 * - MessageLog        — a row in the message_logs DB table (tracks send status)
 * - EventColor        — the allowed color values for events
 */

export type EventColor = 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';

export const EVENT_COLOR_HEX: Record<EventColor, string> = {
  indigo:  '#6366f1',
  emerald: '#10b981',
  amber:   '#f59e0b',
  rose:    '#f43f5e',
  sky:     '#0ea5e9',
  violet:  '#8b5cf6',
};

export const RECURRENCE_OPTIONS = [
  { value: 'none',    label: 'Does not repeat' },
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly' },
] as const;

/** A single browser notification attached to an event or todo */
export interface BrowserNotification {
  id: string;
  /** Minutes BEFORE the event/todo to fire (0 = at the time, 60 = 1 h before, etc.) */
  offsetMinutes: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO date string YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
  color: EventColor;
  allDay: boolean;
  // New fields
  tags: string[];
  folderId: string | null;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrenceEnd?: string; // YYYY-MM-DD
  // Scheduled actions
  scheduledEmail?: ScheduledEmail;
  scheduledWhatsApp?: ScheduledWhatsApp;
  // Browser notifications
  notifications?: BrowserNotification[];
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledEmail {
  id: string;
  to: string[];
  subject: string;
  body: string;
  scheduledAt: string; // ISO datetime
  sent: boolean;
  sentAt?: string;
}

export interface ScheduledWhatsApp {
  id: string;
  to: string; // phone number with country code
  message: string;
  scheduledAt: string; // ISO datetime
  sent: boolean;
  sentAt?: string;
  templateName?: string;
}

export interface MessageLog {
  id: string;
  type: 'email' | 'whatsapp';
  status: 'pending' | 'sent' | 'failed';
  recipient: string;
  subject?: string;
  message: string;
  scheduledAt: string;
  sentAt?: string;
  error?: string;
  eventId?: string;
}

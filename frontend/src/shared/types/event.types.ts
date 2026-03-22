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

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO date string YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
  color: EventColor;
  allDay: boolean;
  // Scheduled actions
  scheduledEmail?: ScheduledEmail;
  scheduledWhatsApp?: ScheduledWhatsApp;
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

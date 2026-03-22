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

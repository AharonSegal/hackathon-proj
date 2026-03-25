/**
 * shared/context/EventsContext.tsx
 * ----------------------------------
 * Global events state backed by the Turso database via /api/events.
 *
 * Strategy: optimistic updates with localStorage cache, same pattern as NotesContext.
 */

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import { type CalendarEvent } from '@/shared/types/event.types';
import { eventApi } from '@/shared/hooks/useApi';

const CACHE_KEY = 'cache_v1_events_list';

function loadCache(): CalendarEvent[] {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]'); }
  catch { return []; }
}

function saveCache(events: CalendarEvent[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(events)); }
  catch { /* storage full — ignore */ }
}

interface EventsContextValue {
  events: CalendarEvent[];
  selectedEvent: CalendarEvent | null;
  setSelectedEvent: (e: CalendarEvent | null) => void;
  createEvent: (data: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  bulkDelete: (ids: string[]) => void;
  bulkMoveToFolder: (ids: string[], folderId: string | null) => void;
  moveToFolder: (id: string, folderId: string | null) => void;
}

const EventsContext = createContext<EventsContextValue | null>(null);

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEventsState] = useState<CalendarEvent[]>(loadCache);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const eventsRef = useRef<CalendarEvent[]>(events);

  const commit = (next: CalendarEvent[]) => {
    eventsRef.current = next;
    setEventsState(next);
    saveCache(next);
    setSelectedEvent(prev => prev ? (next.find(e => e.id === prev.id) ?? null) : null);
  };

  useEffect(() => {
    eventApi.getAll().then(data => commit(data)).catch(() => { /* stay on cache */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createEvent = (data: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();
    const optimistic: CalendarEvent = {
      ...data,
      id: tempId,
      createdAt: now,
      updatedAt: now,
    };
    const snapshot = eventsRef.current;
    commit([optimistic, ...snapshot]);
    setSelectedEvent(optimistic);

    eventApi.create(data)
      .then(saved => commit(eventsRef.current.map(e => e.id === tempId ? saved : e)))
      .catch(() => { commit(snapshot); toast.error('Failed to create event'); });
  };

  const updateEvent = (id: string, patch: Partial<CalendarEvent>) => {
    const snapshot = eventsRef.current;
    commit(snapshot.map(e =>
      e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e,
    ));
    eventApi.update(id, patch)
      .catch(() => { commit(snapshot); toast.error('Failed to update event'); });
  };

  const deleteEvent = (id: string) => {
    const snapshot = eventsRef.current;
    commit(snapshot.filter(e => e.id !== id));
    eventApi.delete(id).catch(() => { commit(snapshot); toast.error('Failed to delete event'); });
  };

  const bulkDelete = (ids: string[]) => {
    const snapshot = eventsRef.current;
    commit(snapshot.filter(e => !ids.includes(e.id)));
    Promise.all(ids.map(id => eventApi.delete(id)))
      .catch(() => { commit(snapshot); toast.error('Failed to delete some events'); });
  };

  const bulkMoveToFolder = (ids: string[], folderId: string | null) => {
    const snapshot = eventsRef.current;
    commit(snapshot.map(e => ids.includes(e.id) ? { ...e, folderId, updatedAt: new Date().toISOString() } : e));
    Promise.all(ids.map(id => eventApi.update(id, { folderId })))
      .catch(() => { commit(snapshot); toast.error('Failed to move some events'); });
  };

  const moveToFolder = (id: string, folderId: string | null) => {
    const snapshot = eventsRef.current;
    commit(snapshot.map(e =>
      e.id === id ? { ...e, folderId, updatedAt: new Date().toISOString() } : e,
    ));
    eventApi.update(id, { folderId })
      .catch(() => { commit(snapshot); toast.error('Failed to move event'); });
  };

  return (
    <EventsContext.Provider value={{
      events, selectedEvent, setSelectedEvent,
      createEvent, updateEvent, deleteEvent,
      bulkDelete, bulkMoveToFolder, moveToFolder,
    }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error('useEvents must be used within EventsProvider');
  return ctx;
}

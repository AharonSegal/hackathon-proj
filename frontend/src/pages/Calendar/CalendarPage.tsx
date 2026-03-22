/**
 * Calendar/CalendarPage.tsx
 * --------------------------
 * The main calendar view — shows events on a monthly grid.
 *
 * Responsibilities:
 * - Owns the events state (fetched from /api/events on mount)
 * - Passes events to useCalendar which computes the grid
 * - Manages the EventModal open/close state
 * - Handles create, update, and delete operations locally (no full refetch)
 *
 * Process Flow:
 * 1. On mount → fetch all events from the API
 * 2. useCalendar builds the grid cells from the events + Hebrew calendar data
 * 3. User clicks a day cell → open EventModal in "create" mode
 * 4. User clicks an event pill → open EventModal in "edit" mode
 * 5. On save → update local events state (add or replace)
 * 6. On delete → remove from local events state
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/shared/components/Layout/PageHeader';
import { Button } from '@/shared/components/ui/Button';
import { CalendarGrid } from './components/CalendarGrid';
import { CalendarHeader } from './components/CalendarHeader';
import { EventModal } from './components/EventModal';
import { useCalendar, DayInfo } from './hooks/useCalendar';
import { CalendarEvent } from '@/shared/types/event.types';
import { eventApi } from '@/shared/hooks/useApi';
import { useT } from '@/shared/i18n/useT';

export function CalendarPage() {
  const t = useT();
  const [events,     setEvents]     = useState<CalendarEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null);
  const [editEvent,   setEditEvent]   = useState<CalendarEvent | null>(null);
  const [modalOpen,   setModalOpen]   = useState(false);

  // Compute the grid — useCalendar rebuilds whenever events or settings change
  const { days, title, hebrewTitle, goToPrev, goToNext, goToToday } = useCalendar(events);

  // Load all events once on mount
  useEffect(() => {
    eventApi.getAll()
      .then(setEvents)
      .catch(() => toast.error('Failed to load events'));
  }, []);

  /** Clicking a day always opens the "new event" modal for that date */
  const handleDayClick = useCallback((day: DayInfo) => {
    setSelectedDay(day);
    setEditEvent(null);  // no pre-filled event = create mode
    setModalOpen(true);
  }, []);

  /** Clicking an event pill opens the "edit event" modal */
  const handleEventClick = useCallback((ev: CalendarEvent, day: DayInfo) => {
    setSelectedDay(day);
    setEditEvent(ev);    // pre-filled event = edit mode
    setModalOpen(true);
  }, []);

  /** "New Event" button in the header — opens modal without a selected day */
  const handleNewEvent = () => {
    setEditEvent(null);
    setModalOpen(true);
  };

  /**
   * Called after a save — adds the event if new, or replaces it if editing.
   * This avoids a full re-fetch from the server.
   */
  const handleSaved = (ev: CalendarEvent) => {
    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === ev.id);
      return idx >= 0
        ? prev.map(e => e.id === ev.id ? ev : e) // replace existing
        : [...prev, ev];                          // append new
    });
  };

  /** Called after a delete — removes the event from local state */
  const handleDeleted = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  // The selected date string is passed to CalendarGrid so it can highlight the cell
  const selectedDateStr = selectedDay?.date.toISOString().slice(0, 10) ?? null;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t.calendar_title}
        subtitle={t.calendar_subtitle}
        actions={
          <Button size="sm" onClick={handleNewEvent}>
            <Plus size={14} />
            {t.new_event}
          </Button>
        }
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <CalendarHeader
          title={title}
          hebrewTitle={hebrewTitle}
          onPrev={goToPrev}
          onNext={goToNext}
          onToday={goToToday}
        />

        <CalendarGrid
          days={days}
          selectedDate={selectedDateStr}
          onDayClick={handleDayClick}
          onEventClick={handleEventClick}
        />
      </div>

      {/* EventModal manages its own form state; receives the selected day + event */}
      <EventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        day={selectedDay}
        editEvent={editEvent}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </div>
  );
}

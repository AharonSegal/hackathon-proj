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

export function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { days, title, hebrewTitle, goToPrev, goToNext, goToToday } = useCalendar(events);

  useEffect(() => {
    eventApi.getAll().then(setEvents).catch(() => toast.error('Failed to load events'));
  }, []);

  const handleDayClick = useCallback((day: DayInfo) => {
    setSelectedDay(day);
    // If clicked on an existing event, edit it; else open new event modal
    if (day.events.length === 0) {
      setEditEvent(null);
      setModalOpen(true);
    }
  }, []);

  const handleEventClick = (ev: CalendarEvent, day: DayInfo) => {
    setSelectedDay(day);
    setEditEvent(ev);
    setModalOpen(true);
  };

  const handleNewEvent = () => {
    setEditEvent(null);
    setModalOpen(true);
  };

  const handleSaved = (ev: CalendarEvent) => {
    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === ev.id);
      return idx >= 0 ? prev.map(e => e.id === ev.id ? ev : e) : [...prev, ev];
    });
  };

  const handleDeleted = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const selectedDateStr = selectedDay?.date.toISOString().slice(0, 10) ?? null;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Calendar"
        subtitle="Hebrew / Gregorian dual calendar"
        actions={
          <Button size="sm" onClick={handleNewEvent}>
            <Plus size={14} />
            New Event
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
        />
      </div>

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

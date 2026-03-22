import { DayInfo } from '@/pages/Calendar/hooks/useCalendar';
import { CalendarEvent } from '@/shared/types/event.types';
import { DayCell } from './DayCell';
import { useSettings } from '@/shared/context/SettingsContext';

const DAYS_GREGORIAN     = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_GREGORIAN_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_HEBREW        = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

interface CalendarGridProps {
  days: DayInfo[];
  selectedDate: string | null;
  onDayClick: (day: DayInfo) => void;
  onEventClick: (ev: CalendarEvent, day: DayInfo) => void;
}

export function CalendarGrid({ days, selectedDate, onDayClick, onEventClick }: CalendarGridProps) {
  const { settings } = useSettings();
  const weekStart = settings.weekStart;
  const isHebrew  = settings.calendarMode === 'hebrew';

  const headers = isHebrew
    ? weekStart === 1 ? [...DAYS_HEBREW.slice(1), DAYS_HEBREW[0]] : DAYS_HEBREW
    : weekStart === 1 ? DAYS_GREGORIAN_MON : DAYS_GREGORIAN;

  const isShabbatCol = (i: number) =>
    (weekStart === 0 && i === 6) || (weekStart === 1 && i === 5);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900/50">
        {headers.map((h, i) => (
          <div
            key={i}
            className={clsx(
              'py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider',
              isShabbatCol(i) ? 'text-violet-400' : 'text-slate-500',
            )}
          >
            {h}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr border-l border-t border-slate-800/70 overflow-auto">
        {days.map((day, i) => (
          <DayCell
            key={i}
            day={day}
            onClick={onDayClick}
            onEventClick={onEventClick}
            isSelected={day.date.toISOString().slice(0, 10) === selectedDate}
          />
        ))}
      </div>
    </div>
  );
}

// clsx inline so no extra import needed
function clsx(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

import { DayInfo } from '@/pages/Calendar/hooks/useCalendar';
import { DayCell } from './DayCell';
import { useSettings } from '@/shared/context/SettingsContext';

const DAYS_GREGORIAN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_GREGORIAN_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_HEBREW = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

interface CalendarGridProps {
  days: DayInfo[];
  selectedDate: string | null;
  onDayClick: (day: DayInfo) => void;
}

export function CalendarGrid({ days, selectedDate, onDayClick }: CalendarGridProps) {
  const { settings } = useSettings();
  const weekStart = settings.weekStart;
  const isHebrew = settings.calendarMode === 'hebrew';

  const headers = isHebrew
    ? weekStart === 1
      ? [...DAYS_HEBREW.slice(1), DAYS_HEBREW[0]]
      : DAYS_HEBREW
    : weekStart === 1
    ? DAYS_GREGORIAN_MON
    : DAYS_GREGORIAN;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-800">
        {headers.map((h, i) => (
          <div
            key={i}
            className={`py-2 text-center text-xs font-medium ${
              (weekStart === 0 && i === 6) || (weekStart === 1 && i === 5)
                ? 'text-violet-400'
                : 'text-slate-500'
            }`}
          >
            {h}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr border-l border-t border-slate-800 overflow-auto">
        {days.map((day, i) => (
          <DayCell
            key={i}
            day={day}
            onClick={onDayClick}
            isSelected={day.date.toISOString().slice(0, 10) === selectedDate}
          />
        ))}
      </div>
    </div>
  );
}

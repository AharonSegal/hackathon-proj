import { DayInfo } from '@/pages/Calendar/hooks/useCalendar';
import { useSettings } from '@/shared/context/SettingsContext';
import { CalendarEvent } from '@/shared/types/event.types';
import { clsx } from 'clsx';

const EVENT_COLORS: Record<CalendarEvent['color'], string> = {
  indigo: 'bg-indigo-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
};

interface DayCellProps {
  day: DayInfo;
  onClick: (day: DayInfo) => void;
  isSelected: boolean;
}

export function DayCell({ day, onClick, isSelected }: DayCellProps) {
  const { settings } = useSettings();
  const isHebrew = settings.calendarMode === 'hebrew';

  // Pick up notable Hebrew events (holidays, parasha, etc.)
  const hebrewLabels = day.hebrewEvents
    .filter(ev => ev.getDesc() !== 'Shabbat Mevarchim')
    .slice(0, 2)
    .map(ev => {
      const desc = ev.getDesc();
      // Shorten for display
      return desc.length > 16 ? desc.slice(0, 14) + '…' : desc;
    });

  const isRoshChodesh = day.hebrewEvents.some(ev => ev.getDesc().startsWith('Rosh Chodesh'));
  const isHoliday = day.hebrewEvents.some(ev => {
    const d = ev.getDesc();
    return !d.includes('Havdalah') && !d.includes('Candle') && !d.includes('Mevarchim');
  });

  const primaryDate = isHebrew ? day.hebrewDateNumeral : String(day.date.getDate());
  const secondaryDate = isHebrew ? String(day.date.getDate()) : day.hebrewDateNumeral;

  return (
    <div
      onClick={() => onClick(day)}
      className={clsx(
        'min-h-[90px] p-1.5 border-b border-r border-slate-800 cursor-pointer transition-colors',
        'hover:bg-slate-800/50',
        !day.isCurrentMonth && 'opacity-35',
        day.isShabbat && day.isCurrentMonth && 'bg-violet-950/20',
        isSelected && 'bg-primary-900/40 ring-1 ring-inset ring-primary-500',
      )}
    >
      {/* Date number */}
      <div className="flex items-start justify-between">
        <div
          className={clsx(
            'w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold',
            isHebrew ? 'font-hebrew' : '',
            day.isToday
              ? 'bg-primary-600 text-white'
              : isRoshChodesh
              ? 'text-cyan-400'
              : 'text-slate-300',
          )}
        >
          {primaryDate}
        </div>
        {/* Secondary date (small) */}
        <span
          className={clsx(
            'text-[10px] text-slate-500 mt-0.5',
            !isHebrew && 'font-hebrew',
          )}
        >
          {secondaryDate}
        </span>
      </div>

      {/* Hebrew labels */}
      <div className="mt-1 space-y-0.5">
        {hebrewLabels.map((label, i) => (
          <div
            key={i}
            className={clsx(
              'text-[10px] px-1 rounded truncate',
              isHoliday ? 'text-amber-300 bg-amber-500/10' : 'text-slate-400',
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {/* User events */}
      <div className="mt-1 space-y-0.5">
        {day.events.slice(0, 2).map(ev => (
          <div
            key={ev.id}
            className={clsx(
              'text-[10px] px-1.5 py-0.5 rounded text-white truncate',
              EVENT_COLORS[ev.color],
            )}
          >
            {ev.startTime && <span className="opacity-75 mr-1">{ev.startTime}</span>}
            {ev.title}
          </div>
        ))}
        {day.events.length > 2 && (
          <div className="text-[10px] text-slate-500 px-1">+{day.events.length - 2} more</div>
        )}
      </div>
    </div>
  );
}

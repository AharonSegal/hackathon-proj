import { DayInfo } from '@/pages/Calendar/hooks/useCalendar';
import { useSettings } from '@/shared/context/SettingsContext';
import { CalendarEvent } from '@/shared/types/event.types';
import { clsx } from 'clsx';

const EVENT_DOT_COLORS: Record<CalendarEvent['color'], string> = {
  indigo: 'bg-indigo-400',
  emerald: 'bg-emerald-400',
  amber:   'bg-amber-400',
  rose:    'bg-rose-400',
  sky:     'bg-sky-400',
  violet:  'bg-violet-400',
};

const EVENT_PILL_COLORS: Record<CalendarEvent['color'], string> = {
  indigo: 'bg-indigo-500/90',
  emerald: 'bg-emerald-500/90',
  amber:   'bg-amber-500/90',
  rose:    'bg-rose-500/90',
  sky:     'bg-sky-500/90',
  violet:  'bg-violet-500/90',
};

interface DayCellProps {
  day: DayInfo;
  onClick: (day: DayInfo) => void;
  onEventClick: (ev: CalendarEvent, day: DayInfo) => void;
  isSelected: boolean;
}

export function DayCell({ day, onClick, onEventClick, isSelected }: DayCellProps) {
  const { settings } = useSettings();
  const isHebrew = settings.calendarMode === 'hebrew';

  const hebrewLabels = day.hebrewEvents
    .filter(ev => ev.getDesc() !== 'Shabbat Mevarchim')
    .slice(0, 1)
    .map(ev => {
      const desc = ev.getDesc();
      return desc.length > 18 ? desc.slice(0, 16) + '…' : desc;
    });

  const isRoshChodesh = day.hebrewEvents.some(ev => ev.getDesc().startsWith('Rosh Chodesh'));
  const isHoliday = day.hebrewEvents.some(ev => {
    const d = ev.getDesc();
    return !d.includes('Havdalah') && !d.includes('Candle') && !d.includes('Mevarchim');
  });

  const primaryDate   = isHebrew ? day.hebrewDateNumeral : String(day.date.getDate());
  const secondaryDate = isHebrew ? String(day.date.getDate()) : day.hebrewDateNumeral;

  const hasEvents = day.events.length > 0;

  return (
    <div
      onClick={() => onClick(day)}
      className={clsx(
        'group relative flex flex-col min-h-[110px] p-2 border-b border-r border-slate-800/70',
        'cursor-pointer transition-colors duration-100',
        !day.isCurrentMonth && 'opacity-30',
        day.isShabbat && day.isCurrentMonth && 'bg-violet-950/15',
        isSelected
          ? 'bg-primary-900/30 ring-1 ring-inset ring-primary-600/60'
          : 'hover:bg-slate-800/40',
      )}
    >
      {/* ── Top row: date number + secondary date ── */}
      <div className="flex items-start justify-between mb-1">

        {/* Primary date circle */}
        <div
          className={clsx(
            'w-7 h-7 flex items-center justify-center rounded-full text-[13px] font-semibold leading-none select-none',
            isHebrew ? 'font-hebrew' : '',
            day.isToday
              ? 'bg-primary-600 text-white shadow-md'
              : isRoshChodesh
              ? 'text-cyan-400 font-bold'
              : 'text-slate-200 group-hover:text-white',
          )}
        >
          {primaryDate}
        </div>

        {/* Secondary (small) date */}
        <span
          className={clsx(
            'text-[10px] text-slate-600 mt-0.5 leading-none',
            !isHebrew && 'font-hebrew',
          )}
        >
          {secondaryDate}
        </span>
      </div>

      {/* ── Hebrew / holiday label ── */}
      {hebrewLabels.length > 0 && (
        <div className="mb-1">
          {hebrewLabels.map((label, i) => (
            <div
              key={i}
              className={clsx(
                'text-[9px] px-1 rounded truncate leading-tight',
                isHoliday ? 'text-amber-300 bg-amber-500/10' : 'text-slate-500',
              )}
            >
              {label}
            </div>
          ))}
        </div>
      )}

      {/* ── Event pills (max 2) ── */}
      <div className="flex-1 space-y-0.5">
        {day.events.slice(0, 2).map(ev => (
          <button
            key={ev.id}
            onClick={e => {
              e.stopPropagation();   // don't trigger day click
              onEventClick(ev, day);
            }}
            className={clsx(
              'w-full text-left text-[10px] px-1.5 py-[2px] rounded text-white truncate block',
              'hover:brightness-110 transition-all',
              EVENT_PILL_COLORS[ev.color],
            )}
          >
            {ev.startTime && <span className="opacity-70 mr-1">{ev.startTime}</span>}
            {ev.title}
          </button>
        ))}
        {day.events.length > 2 && (
          <div className="text-[9px] text-slate-500 px-1">+{day.events.length - 2} more</div>
        )}
      </div>

      {/* ── Green dot indicator (bottom-right) ── */}
      {hasEvents && (
        <div className="absolute bottom-2 right-2 flex items-center gap-0.5">
          {day.events.slice(0, 3).map(ev => (
            <span
              key={ev.id}
              className={clsx('w-1.5 h-1.5 rounded-full', EVENT_DOT_COLORS[ev.color])}
            />
          ))}
        </div>
      )}

      {/* ── "+" hint on hover (empty days) ── */}
      {!hasEvents && (
        <div className="absolute bottom-1.5 right-2 text-[11px] text-slate-700 group-hover:text-slate-500 transition-colors select-none">
          +
        </div>
      )}
    </div>
  );
}

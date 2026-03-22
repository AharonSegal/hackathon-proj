/**
 * Calendar/components/DayCell.tsx
 * --------------------------------
 * A single day cell in the calendar grid.
 *
 * Each cell displays:
 * - Primary date number (Hebrew gematriya in Hebrew mode, Gregorian day number otherwise)
 * - Secondary date (the other system, smaller, top-right)
 * - Up to 1 Hebrew holiday / parasha label (amber for holidays, muted for others)
 * - Up to 2 user event pills (colored, clickable to edit)
 * - "+N more" label if there are more than 2 events
 * - Color dots (bottom-right): one per event, up to 3
 * - "+" hint on hover for empty days
 * - Shabbat tint (violet) on Saturday columns
 *
 * Clicking the cell → opens "new event" modal for that date.
 * Clicking an event pill → opens "edit event" modal (stops propagation).
 */

import { DayInfo } from '@/pages/Calendar/hooks/useCalendar';
import { useSettings } from '@/shared/context/SettingsContext';
import { CalendarEvent } from '@/shared/types/event.types';
import { clsx } from 'clsx';
import { EVENT_DOT_COLORS, EVENT_PILL_COLORS } from '@/shared/colors';

interface DayCellProps {
  day: DayInfo;
  /** Called when the user clicks anywhere on the cell */
  onClick: (day: DayInfo) => void;
  /** Called when the user clicks a specific event pill */
  onEventClick: (ev: CalendarEvent, day: DayInfo) => void;
  /** Whether this cell is currently "selected" (e.g. the last clicked day) */
  isSelected: boolean;
}

export function DayCell({ day, onClick, onEventClick, isSelected }: DayCellProps) {
  const { settings } = useSettings();
  const isHebrew = settings.calendarMode === 'hebrew';

  // Build the holiday label — filter out internal-only events, limit to 1 per cell
  const hebrewLabels = day.hebrewEvents
    .filter(ev => ev.getDesc() !== 'Shabbat Mevarchim')
    .slice(0, 1)
    .map(ev => {
      const desc = ev.getDesc();
      // Truncate long holiday names to keep the cell tidy
      return desc.length > 18 ? desc.slice(0, 16) + '…' : desc;
    });

  // Determine holiday type for visual styling
  const isRoshChodesh = day.hebrewEvents.some(ev => ev.getDesc().startsWith('Rosh Chodesh'));
  const isHoliday     = day.hebrewEvents.some(ev => {
    const d = ev.getDesc();
    // Exclude candle-lighting and havdalah from "holiday" highlight
    return !d.includes('Havdalah') && !d.includes('Candle') && !d.includes('Mevarchim');
  });

  // Which date to show prominently depends on the calendar mode
  const primaryDate   = isHebrew ? day.hebrewDateNumeral : String(day.date.getDate());
  const secondaryDate = isHebrew ? String(day.date.getDate()) : day.hebrewDateNumeral;

  const hasEvents = day.events.length > 0;

  return (
    <div
      onClick={() => onClick(day)}
      className={clsx(
        'group relative flex flex-col min-h-[110px] p-2 border-b border-r border-slate-800/70',
        'cursor-pointer transition-colors duration-100',
        !day.isCurrentMonth && 'opacity-30',                                      // gray out days outside this month
        day.isShabbat && day.isCurrentMonth && 'bg-violet-950/15',               // subtle tint for Shabbat
        isSelected
          ? 'bg-primary-900/30 ring-1 ring-inset ring-primary-600/60'            // selected state
          : 'hover:bg-slate-800/40',                                             // hover state
      )}
    >
      {/* ── Top row: primary date + secondary date ── */}
      <div className="flex items-start justify-between mb-1">

        {/* Primary date — circle highlight for today, cyan for Rosh Chodesh */}
        <div className={clsx(
          'w-7 h-7 flex items-center justify-center rounded-full text-[13px] font-semibold leading-none select-none',
          isHebrew ? 'font-hebrew' : '',
          day.isToday
            ? 'bg-primary-600 text-white shadow-md'  // today gets a filled circle
            : isRoshChodesh
            ? 'text-cyan-400 font-bold'
            : 'text-slate-200 group-hover:text-white',
        )}>
          {primaryDate}
        </div>

        {/* Secondary date (smaller, opposite calendar system) */}
        <span className={clsx(
          'text-[10px] text-slate-600 mt-0.5 leading-none',
          !isHebrew && 'font-hebrew',
        )}>
          {secondaryDate}
        </span>
      </div>

      {/* ── Hebrew holiday / parasha label ── */}
      {hebrewLabels.length > 0 && (
        <div className="mb-1">
          {hebrewLabels.map((label, i) => (
            <div key={i} className={clsx(
              'text-[9px] px-1 rounded truncate leading-tight',
              isHoliday ? 'text-amber-300 bg-amber-500/10' : 'text-slate-500',
            )}>
              {label}
            </div>
          ))}
        </div>
      )}

      {/* ── Event pills (max 2 shown, rest indicated by "+N more") ── */}
      <div className="flex-1 space-y-0.5">
        {day.events.slice(0, 2).map(ev => (
          <button
            key={ev.id}
            onClick={e => {
              e.stopPropagation(); // prevent the day-click handler from also firing
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

      {/* ── Color dots (bottom-right): one per event, max 3 ── */}
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

      {/* ── "+" hint: only shown on hover for empty days ── */}
      {!hasEvents && (
        <div className="absolute bottom-1.5 right-2 text-[11px] text-slate-700 group-hover:text-slate-500 transition-colors select-none">
          +
        </div>
      )}
    </div>
  );
}

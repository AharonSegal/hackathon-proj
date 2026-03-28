/**
 * DashboardClockHero.tsx
 * -----------------------
 * Large hero clock card for the dashboard top section.
 * Replaces the PageHeader — shows Hebrew date, Gregorian date, and the clock(s).
 *
 * A single `now` state drives both the dates and the clock displays,
 * so they always show the exact same moment.
 */

import { useState, useEffect } from 'react';
import { HDate } from '@hebcal/core';
import { AnimatePresence, motion } from 'framer-motion';
import Clock from 'react-clock';
import 'react-clock/dist/Clock.css';
import { useSettings } from '@/shared/context/SettingsContext';
import { formatFullHebrewDate } from '@/pages/Calendar/hooks/useCalendar';
import { ClockTheme, ClockEntry, ClockSettings } from '@/shared/types/settings.types';

// ── Theme maps ────────────────────────────────────────────────────────────────

const THEME_TEXT: Record<ClockTheme, string> = {
  purple:  'text-violet-400',
  blue:    'text-blue-400',
  amber:   'text-amber-400',
  emerald: 'text-emerald-400',
  rose:    'text-rose-400',
  slate:   'text-slate-300',
};

const THEME_HEX: Record<ClockTheme, string> = {
  purple:  '#a78bfa',
  blue:    '#60a5fa',
  amber:   '#fbbf24',
  emerald: '#34d399',
  rose:    '#fb7185',
  slate:   '#cbd5e1',
};

// ── Intl helpers ──────────────────────────────────────────────────────────────

function fmt(date: Date, tz: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, ...opts }).format(date);
}

function toClockDate(now: Date, tz: string): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0');
  const d = new Date(now);
  d.setHours(get('hour') % 24, get('minute'), get('second'), 0);
  return d;
}

// ── Flip digit ────────────────────────────────────────────────────────────────

function FlipChar({ value, color, className }: { value: string; color: string; className?: string }) {
  return (
    <span className={`relative inline-block overflow-hidden ${className ?? ''}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className={`inline-block tabular-nums font-mono ${color}`}
          initial={{ y: '-70%', opacity: 0 }}
          animate={{ y: '0%',   opacity: 1 }}
          exit={{    y:  '70%', opacity: 0 }}
          transition={{ duration: 0.16, ease: 'easeInOut' }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function FlipTime({
  value, color, size,
}: { value: string; color: string; size: string }) {
  return (
    <span className={`inline-flex items-baseline leading-none ${size}`}>
      {value.split('').map((ch, i) =>
        ch === ':' ? (
          <span key={i} className={`${color} font-mono mx-px opacity-70`}>:</span>
        ) : (
          <FlipChar key={`${i}`} value={ch} color={color} className="w-[0.58em]" />
        )
      )}
    </span>
  );
}

// ── Digital hero display ──────────────────────────────────────────────────────

function HeroDigital({
  entry, clock, now, multi,
}: { entry: ClockEntry; clock: ClockSettings; now: Date; multi: boolean }) {
  const hour   = fmt(now, entry.tz, { hour: '2-digit',   hour12: !clock.use24h });
  const minute = fmt(now, entry.tz, { minute: '2-digit' });
  const second = clock.showSeconds ? fmt(now, entry.tz, { second: '2-digit' }) : null;
  const timeStr = second ? `${hour}:${minute}:${second}` : `${hour}:${minute}`;

  const accent  = THEME_TEXT[clock.theme];
  const sizeClass = multi ? 'text-4xl sm:text-5xl' : 'text-5xl sm:text-6xl';

  return (
    <div className="flex flex-col items-center gap-1">
      {multi && (
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          {entry.label}
        </span>
      )}
      <FlipTime value={timeStr} color={accent} size={`font-bold tracking-tight ${sizeClass}`} />
    </div>
  );
}

// ── Analog hero display ───────────────────────────────────────────────────────

function HeroAnalog({
  entry, clock, now, multi,
}: { entry: ClockEntry; clock: ClockSettings; now: Date; multi: boolean }) {
  const clockDate = toClockDate(now, entry.tz);
  const accent    = THEME_HEX[clock.theme];
  const size      = multi ? 110 : 140;

  return (
    <div className="flex flex-col items-center gap-1.5">
      {multi && (
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          {entry.label}
        </span>
      )}
      <div
        className="analog-clock-wrapper"
        style={{ '--clock-color': accent } as React.CSSProperties}
      >
        <Clock
          value={clockDate}
          size={size}
          renderNumbers={false}
          renderSecondHand={clock.showSeconds}
          hourHandLength={55}
          hourHandOppositeLength={10}
          hourHandWidth={4}
          minuteHandLength={75}
          minuteHandOppositeLength={10}
          minuteHandWidth={2.5}
          secondHandLength={80}
          secondHandOppositeLength={15}
          secondHandWidth={1.5}
        />
      </div>
    </div>
  );
}

// ── Minimal hero display ──────────────────────────────────────────────────────

function HeroMinimal({
  entry, clock, now,
}: { entry: ClockEntry; clock: ClockSettings; now: Date }) {
  const hour   = fmt(now, entry.tz, { hour: '2-digit',   hour12: !clock.use24h });
  const minute = fmt(now, entry.tz, { minute: '2-digit' });
  const dayName = fmt(now, entry.tz, { weekday: 'short' });
  const accent  = THEME_TEXT[clock.theme];

  return (
    <div className="flex items-center justify-between gap-6 w-full px-1">
      <span className="text-sm font-semibold text-slate-400 min-w-[64px]">{entry.label}</span>
      <span className={`text-xl font-bold font-mono tabular-nums ${accent}`}>{hour}:{minute}</span>
      <span className="text-xs text-slate-600 min-w-[24px] text-right">{dayName}</span>
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────

export function DashboardClockHero() {
  const { settings } = useSettings();
  const { clock } = settings;

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!clock.show) return null;

  const activeClocks = clock.clocks.filter(c => c.show);
  if (activeClocks.length === 0) return null;

  const hToday  = new HDate(now);
  const multi   = activeClocks.length > 1;

  const hebrewDate    = formatFullHebrewDate(hToday);
  const gregorianDate = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="flex-1 min-w-[260px] bg-slate-900/40 rounded-2xl border border-slate-800/60 backdrop-blur-sm px-6 py-5 flex flex-col items-center justify-center gap-3">

      {/* Hebrew date — prominent, RTL */}
      <p
        className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-wide leading-tight"
        dir="rtl"
        style={{ fontFamily: "'Heebo', sans-serif" }}
      >
        {hebrewDate}
      </p>

      {/* Gregorian date — subtle */}
      <p className="text-xs text-slate-500 font-medium -mt-1">
        {gregorianDate}
      </p>

      {/* Divider */}
      <div className="w-16 h-px bg-slate-700/60" />

      {/* Clock display(s) */}
      <div className={`flex ${clock.style === 'minimal' ? 'flex-col w-full gap-2' : 'flex-row gap-8 items-center'}`}>
        {activeClocks.map(entry =>
          clock.style === 'digital' ? (
            <HeroDigital   key={entry.tz + entry.label} entry={entry} clock={clock} now={now} multi={multi} />
          ) : clock.style === 'analog' ? (
            <HeroAnalog    key={entry.tz + entry.label} entry={entry} clock={clock} now={now} multi={multi} />
          ) : (
            <HeroMinimal   key={entry.tz + entry.label} entry={entry} clock={clock} now={now} />
          )
        )}
      </div>

      {/* Label for single digital clock */}
      {!multi && clock.style !== 'analog' && (
        <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest -mt-1">
          {activeClocks[0].label}
        </p>
      )}
    </div>
  );
}

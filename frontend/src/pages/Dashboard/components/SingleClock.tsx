/**
 * SingleClock.tsx
 * ----------------
 * Renders one clock for a given timezone.
 * Supports three visual styles: digital, analog, minimal.
 *
 * - Initialised with `useState(() => new Date())` — correct on first render, no flash.
 * - setInterval ticks every second, cleaned up on unmount.
 * - All timezone math via Intl.DateTimeFormat — zero extra deps.
 * - Analog face via react-clock (SVG, ~1.6KB gzipped).
 * - Digital digit transitions via framer-motion AnimatePresence.
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Clock from 'react-clock';
import 'react-clock/dist/Clock.css';
import { ClockEntry, ClockStyle, ClockTheme } from '@/shared/types/settings.types';

// ── Theme → Tailwind class maps ──────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPart(
  date: Date,
  tz: string,
  parts: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, ...parts }).format(date);
}

function getTimeParts(date: Date, tz: string, use24h: boolean, showSeconds: boolean) {
  const hour   = formatPart(date, tz, { hour: '2-digit',   hour12: !use24h });
  const minute = formatPart(date, tz, { minute: '2-digit' });
  const second = showSeconds ? formatPart(date, tz, { second: '2-digit' }) : null;
  const dayName = formatPart(date, tz, { weekday: 'short' });
  const dateStr = formatPart(date, tz, { month: 'short', day: 'numeric' });
  return { hour, minute, second, dayName, dateStr };
}

/** Return a Date object adjusted so that new Date().getTime() reflects the wall-clock
 *  time in the target timezone — needed for react-clock which just reads .getHours() etc. */
function toClockDate(now: Date, tz: string): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
  }).formatToParts(now);

  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0');
  const h = get('hour') % 24;
  const m = get('minute');
  const s = get('second');

  const d = new Date(now);
  d.setHours(h, m, s, 0);
  return d;
}

// ── Flip digit ───────────────────────────────────────────────────────────────

function FlipDigit({ value, color }: { value: string; color: string }) {
  return (
    <span className="relative inline-block w-[1ch] overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className={`inline-block tabular-nums font-mono ${color}`}
          initial={{ y: '-60%', opacity: 0 }}
          animate={{ y: '0%',   opacity: 1 }}
          exit={{    y:  '60%', opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeInOut' }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function FlipTime({
  value,
  color,
}: {
  value: string;   // e.g. "14:32:07" or "14:32"
  color: string;
}) {
  return (
    <span className="inline-flex items-center gap-0">
      {value.split('').map((ch, i) =>
        ch === ':' ? (
          <span key={i} className={`${color} font-mono tabular-nums`}>:</span>
        ) : (
          <FlipDigit key={`${i}-${ch}`} value={ch} color={color} />
        )
      )}
    </span>
  );
}

// ── Style: Digital ───────────────────────────────────────────────────────────

function DigitalClock({
  entry, theme, showSeconds, use24h,
}: {
  entry: ClockEntry; theme: ClockTheme; showSeconds: boolean; use24h: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const { hour, minute, second, dayName, dateStr } = getTimeParts(now, entry.tz, use24h, showSeconds);
  const timeStr = showSeconds ? `${hour}:${minute}:${second}` : `${hour}:${minute}`;
  const accent = THEME_TEXT[theme];

  return (
    <div className="flex flex-col items-center gap-0.5 px-3 py-2 min-w-[100px]">
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest truncate max-w-full">
        {entry.label}
      </span>
      <div className="text-2xl sm:text-3xl font-bold leading-none tracking-tight">
        <FlipTime value={timeStr} color={accent} />
      </div>
      <span className="text-[10px] text-slate-500 font-medium">
        {dayName} · {dateStr}
      </span>
    </div>
  );
}

// ── Style: Analog ────────────────────────────────────────────────────────────

function AnalogClock({
  entry, theme, showSeconds,
}: {
  entry: ClockEntry; theme: ClockTheme; showSeconds: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const clockDate = toClockDate(now, entry.tz);
  const accent = THEME_HEX[theme];
  const dateStr = formatPart(now, entry.tz, { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="flex flex-col items-center gap-1.5 px-3 py-2">
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
        {entry.label}
      </span>
      <div
        className="analog-clock-wrapper"
        style={{
          '--clock-color': accent,
        } as React.CSSProperties}
      >
        <Clock
          value={clockDate}
          size={100}
          renderNumbers={false}
          renderSecondHand={showSeconds}
          hourHandLength={55}
          hourHandOppositeLength={10}
          hourHandWidth={3}
          minuteHandLength={75}
          minuteHandOppositeLength={10}
          minuteHandWidth={2}
          secondHandLength={80}
          secondHandOppositeLength={15}
          secondHandWidth={1}
        />
      </div>
      <span className="text-[10px] text-slate-500 font-medium">{dateStr}</span>
    </div>
  );
}

// ── Style: Minimal ───────────────────────────────────────────────────────────

function MinimalClock({
  entry, theme, use24h,
}: {
  entry: ClockEntry; theme: ClockTheme; use24h: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const { hour, minute, dayName } = getTimeParts(now, entry.tz, use24h, false);
  const accent = THEME_TEXT[theme];

  return (
    <div className="flex items-center justify-between gap-4 px-3 py-1.5 w-full">
      <span className="text-xs font-semibold text-slate-400 w-16 truncate">{entry.label}</span>
      <span className={`text-sm font-bold font-mono tabular-nums ${accent}`}>
        {hour}:{minute}
      </span>
      <span className="text-[10px] text-slate-600 w-7 text-right">{dayName}</span>
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────

interface SingleClockProps {
  entry: ClockEntry;
  style: ClockStyle;
  theme: ClockTheme;
  showSeconds: boolean;
  use24h: boolean;
  isLast: boolean;
}

export function SingleClock({ entry, style, theme, showSeconds, use24h, isLast }: SingleClockProps) {
  const showDivider = !isLast && style !== 'minimal';

  return (
    <div className={`flex ${showDivider ? 'border-r border-slate-700/50' : ''}`}>
      {style === 'digital' && (
        <DigitalClock entry={entry} theme={theme} showSeconds={showSeconds} use24h={use24h} />
      )}
      {style === 'analog' && (
        <AnalogClock entry={entry} theme={theme} showSeconds={showSeconds} />
      )}
      {style === 'minimal' && (
        <MinimalClock entry={entry} theme={theme} use24h={use24h} />
      )}
    </div>
  );
}

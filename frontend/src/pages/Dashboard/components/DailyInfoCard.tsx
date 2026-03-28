/**
 * DailyInfoCard.tsx
 * ------------------
 * Compact dashboard card showing the weekly parasha + 7 key zmanim.
 *
 * Daily zmanim (MGA & GRA shma, tfilla, shki'a) — computed for TODAY.
 * כניסת שבת  — Friday's sunset − 18 min (upcoming Friday, or today if Friday).
 * צאת שבת    — Upcoming Saturday's tzait.
 * Parasha    — fetched for the upcoming/current Shabbat.
 */

import { useMemo } from 'react';
import { HebrewCalendar } from '@hebcal/core';
import { ComplexZmanimCalendar, GeoLocation } from 'kosher-zmanim';
import { useSettings } from '@/shared/context/SettingsContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCalc(date: Date, lat: number, lng: number, tz: string): ComplexZmanimCalendar | null {
  try {
    const geo = new GeoLocation('', lat, lng, 0, tz);
    const cal = new ComplexZmanimCalendar(geo);
    cal.setDate(date);
    return cal;
  } catch {
    return null;
  }
}

function fmtLuxon(dt: unknown, tz: string): string {
  if (!dt) return '—';
  try {
    const jsDate = (dt as { toJSDate: () => Date }).toJSDate();
    return jsDate.toLocaleTimeString('he-IL', {
      hour: '2-digit', minute: '2-digit', timeZone: tz, hour12: false,
    });
  } catch {
    return '—';
  }
}

function fmtDate(date: Date | null, tz: string): string {
  if (!date) return '—';
  return date.toLocaleTimeString('he-IL', {
    hour: '2-digit', minute: '2-digit', timeZone: tz, hour12: false,
  });
}

/** Next Friday from today (or today if today is Friday) */
function upcomingFriday(from: Date): Date {
  const d = new Date(from);
  const diff = (5 - from.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Next Saturday from today (or today if today is Saturday) */
function upcomingShabbat(from: Date): Date {
  const d = new Date(from);
  const diff = (6 - from.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Find the Hebrew name of the next weekly parasha.
 * Searches up to 5 Saturdays ahead because holiday weeks (Pesach, Sukkot, etc.)
 * emit no regular Parashat entry — hebcal only emits sedra on non-holiday Shabbatot.
 */
function getParasha(from: Date, il: boolean): string | null {
  try {
    const firstShabbat = upcomingShabbat(from);
    for (let week = 0; week <= 4; week++) {
      const d = new Date(firstShabbat);
      d.setDate(d.getDate() + week * 7);
      const events = HebrewCalendar.calendar({
        start: d, end: d, il, sedrot: true,
      } as Parameters<typeof HebrewCalendar.calendar>[0]);
      const ev = events.find(e =>
        e.getDesc().startsWith('Parashat') || e.getDesc().startsWith('Parasha')
      );
      if (ev) {
        // render('he') returns the Hebrew name; fall back to English if empty
        const hebrew = ev.render('he');
        return hebrew || ev.getDesc();
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DailyInfoCard() {
  const { settings } = useSettings();
  const { lat, lng, timezone } = settings.zmanim.location;
  const il = !settings.holidays.diaspora;

  const today    = useMemo(() => new Date(), []);
  const friday   = useMemo(() => upcomingFriday(today),  [today]);
  const shabbat  = useMemo(() => upcomingShabbat(today), [today]);

  const calcToday   = useMemo(() => buildCalc(today,   lat, lng, timezone), [today,   lat, lng, timezone]);
  const calcFriday  = useMemo(() => buildCalc(friday,  lat, lng, timezone), [friday,  lat, lng, timezone]);
  const calcShabbat = useMemo(() => buildCalc(shabbat, lat, lng, timezone), [shabbat, lat, lng, timezone]);

  const parasha = useMemo(() => getParasha(today, il), [today, il]);

  // כניסת שבת = Friday sunset − 18 minutes
  const candleLighting = useMemo(() => {
    if (!calcFriday) return null;
    try {
      const sunsetLuxon = calcFriday.getSunset();
      if (!sunsetLuxon) return null;
      const jsDate = (sunsetLuxon as unknown as { toJSDate: () => Date }).toJSDate();
      return new Date(jsDate.getTime() - 18 * 60 * 1000);
    } catch { return null; }
  }, [calcFriday]);

  const f  = (dt: unknown) => fmtLuxon(dt, timezone);
  const fd = (d: Date | null) => fmtDate(d, timezone);

  const rows: { label: string; time: string }[] = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { label: 'סו"ז ק"ש מג"א', time: f((calcToday as any)?.getSofZmanShmaMGA?.()) },
    { label: 'סו"ז ק"ש גר"א', time: f(calcToday?.getSofZmanShmaGRA()) },
    { label: 'סו"ז תפילה',     time: f(calcToday?.getSofZmanTfilaGRA()) },
    { label: 'שקיעה',           time: f(calcToday?.getSunset()) },
    { label: 'כניסת שבת',       time: fd(candleLighting) },
    { label: 'צאת שבת',         time: f(calcShabbat?.getTzais()) },
  ];

  return (
    <div className="bg-slate-900/40 rounded-2xl border border-slate-800/60 backdrop-blur-sm px-4 py-4 flex flex-col gap-2 min-w-[170px]">

      {/* Parasha */}
      <p
        className="text-sm font-bold text-primary-400 text-right leading-tight"
        dir="rtl"
        style={{ fontFamily: "'Heebo', sans-serif" }}
      >
        {parasha ?? '—'}
      </p>

      <div className="w-full h-px bg-slate-800" />

      {/* Zmanim rows */}
      <div className="space-y-1">
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-mono tabular-nums text-slate-300 shrink-0">
              {row.time}
            </span>
            <span
              className="text-[11px] text-slate-500 text-right leading-tight"
              dir="rtl"
              style={{ fontFamily: "'Heebo', sans-serif" }}
            >
              {row.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

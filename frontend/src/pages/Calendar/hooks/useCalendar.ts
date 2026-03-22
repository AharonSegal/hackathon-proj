/**
 * Calendar/hooks/useCalendar.ts
 * ------------------------------
 * Core logic hook for the calendar grid.
 *
 * Returns an array of DayInfo objects (one per cell) ready for rendering,
 * plus navigation handlers to move between months.
 *
 * Supports two calendar modes (configured in Settings):
 * - "gregorian" — standard January–December months
 * - "hebrew" — Tishrei–Elul months (handles leap years with Adar I/II)
 *
 * Process Flow:
 * 1. viewDate — tracks which month is currently displayed
 * 2. useMemo recomputes the grid whenever viewDate, settings, or events change
 * 3. Grid start/end — padded to full weeks (using the configured weekStart)
 * 4. HebrewCalendar.calendar() — fetches holidays/parasha for the date range
 *    NOTE: candlelighting is disabled here because it requires a GPS location.
 *    Candle-lighting times are shown on the DailyTimes page instead.
 * 5. Each date in the range becomes a DayInfo cell with both Gregorian and Hebrew info
 * 6. goToPrev / goToNext — handle month navigation, including Hebrew leap years
 *
 * Exported helpers (also used by DashboardPage and DailyTimesPage):
 * - gematriyaDay(n) — converts 1–30 to Hebrew letter numeral (א, ב, ... ל)
 * - hebrewMonthName(hDate) — returns the Hebrew month name in Hebrew letters
 */

import { useState, useMemo, useCallback } from 'react';
import { HDate, HebrewCalendar, months, flags } from '@hebcal/core';
import { useSettings } from '@/shared/context/SettingsContext';
import { CalendarEvent } from '@/shared/types/event.types';

/** One cell in the calendar grid */
export interface DayInfo {
  date: Date;
  hDate: HDate;
  isToday: boolean;
  isCurrentMonth: boolean;  // false for padding days from adjacent months
  isShabbat: boolean;
  events: CalendarEvent[];  // user events on this day
  hebrewEvents: ReturnType<typeof HebrewCalendar.calendar>; // holidays/parasha
  hebrewDateStr: string;    // e.g. "ט״ז אייר"
  hebrewDateNumeral: string; // e.g. "טז"
}

/** Map of 1–30 to Hebrew gematriya numerals */
const GEMATRIYA: Record<number, string> = {
  1: 'א', 2: 'ב', 3: 'ג', 4: 'ד', 5: 'ה', 6: 'ו', 7: 'ז', 8: 'ח', 9: 'ט',
  10: 'י', 11: 'יא', 12: 'יב', 13: 'יג', 14: 'יד', 15: 'טו', 16: 'טז',
  17: 'יז', 18: 'יח', 19: 'יט', 20: 'כ', 21: 'כא', 22: 'כב', 23: 'כג',
  24: 'כד', 25: 'כה', 26: 'כו', 27: 'כז', 28: 'כח', 29: 'כט', 30: 'ל',
};

/** Convert a Hebrew day number (1–30) to its gematriya string (e.g. 16 → "טז") */
export function gematriyaDay(day: number): string {
  return GEMATRIYA[day] ?? String(day);
}

/** Hebrew month name lookup (by @hebcal/core month constant → Hebrew text) */
const HEBREW_MONTH_NAMES: Record<number, string> = {
  [months.NISAN]:   'ניסן',
  [months.IYYAR]:   'אייר',
  [months.SIVAN]:   'סיון',
  [months.TAMUZ]:   'תמוז',
  [months.AV]:      'אב',
  [months.ELUL]:    'אלול',
  [months.TISHREI]: 'תשרי',
  [months.CHESHVAN]:'חשון',
  [months.KISLEV]:  'כסלו',
  [months.TEVET]:   'טבת',
  [months.SHVAT]:   'שבט',
  [months.ADAR_I]:  'אדר א׳',
  [months.ADAR_II]: 'אדר ב׳',
};

/** Returns the Hebrew month name in Hebrew letters for a given HDate */
export function hebrewMonthName(hDate: HDate): string {
  return HEBREW_MONTH_NAMES[hDate.getMonth()] ?? '';
}

export function useCalendar(events: CalendarEvent[]) {
  const { settings } = useSettings();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // viewDate represents the "anchor" of the currently shown month
  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );

  /** Go to the previous month (Hebrew-aware) */
  const goToPrev = useCallback(() => {
    if (settings.calendarMode === 'hebrew') {
      const hd = new HDate(viewDate);
      // Nisan (month 1 in @hebcal) wraps back to Adar I of the previous year
      const prevMonth = hd.getMonth() === months.NISAN
        ? { month: months.ADAR_I, year: hd.getFullYear() - 1 }
        : { month: hd.getMonth() - 1, year: hd.getFullYear() };
      setViewDate(new HDate(1, prevMonth.month, prevMonth.year).greg());
    } else {
      setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    }
  }, [settings.calendarMode, viewDate]);

  /** Go to the next month (Hebrew-aware, handles leap year Adar I/II) */
  const goToNext = useCallback(() => {
    if (settings.calendarMode === 'hebrew') {
      const hd = new HDate(viewDate);
      let nextMonth = hd.getMonth() + 1;
      let nextYear  = hd.getFullYear();
      // Wrap around after the last month of the year (Elul in regular years, Adar II in leap)
      const maxMonth = HDate.isLeapYear(nextYear) ? months.ADAR_II : months.ELUL;
      if (nextMonth > maxMonth) { nextMonth = months.TISHREI; nextYear++; }
      setViewDate(new HDate(1, nextMonth, nextYear).greg());
    } else {
      setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    }
  }, [settings.calendarMode, viewDate]);

  /** Jump back to today's month */
  const goToToday = useCallback(() => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }, []);

  const { days, title, hebrewTitle } = useMemo(() => {
    const weekStart = settings.weekStart;
    let startOfGrid: Date;
    let endOfGrid:   Date;

    // ── Step 1: Determine the first and last day of the visible month ──
    if (settings.calendarMode === 'hebrew') {
      const hd = new HDate(viewDate);
      const firstHDay = new HDate(1, hd.getMonth(), hd.getFullYear());
      const lastHDay  = new HDate(firstHDay.daysInMonth(), hd.getMonth(), hd.getFullYear());

      const firstGreg = firstHDay.greg();
      const lastGreg  = lastHDay.greg();

      // Pad to full weeks based on weekStart (0=Sunday, 1=Monday)
      const firstDow = (firstGreg.getDay() - weekStart + 7) % 7;
      startOfGrid = new Date(firstGreg);
      startOfGrid.setDate(startOfGrid.getDate() - firstDow);

      const lastDow = (lastGreg.getDay() - weekStart + 7) % 7;
      endOfGrid = new Date(lastGreg);
      endOfGrid.setDate(endOfGrid.getDate() + (6 - lastDow));

    } else {
      // Gregorian: first/last day of the calendar month
      const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
      const lastDay  = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);

      const firstDow = (firstDay.getDay() - weekStart + 7) % 7;
      startOfGrid = new Date(firstDay);
      startOfGrid.setDate(startOfGrid.getDate() - firstDow);

      const lastDow = (lastDay.getDay() - weekStart + 7) % 7;
      endOfGrid = new Date(lastDay);
      endOfGrid.setDate(endOfGrid.getDate() + (6 - lastDow));
    }

    // ── Step 2: Fetch Hebrew holidays for the entire grid range ──
    // candlelighting/havdalah are disabled because they require a location object.
    // Those times are shown on the DailyTimes page which has a configured location.
    const hebEvents = HebrewCalendar.calendar({
      start:            startOfGrid,
      end:              endOfGrid,
      il:               !settings.holidays.diaspora, // Israel vs diaspora calendar
      sedrot:           settings.holidays.parashat,  // weekly Torah portion
      candlelighting:   false,                       // requires location — disabled
      havdalah:         false,                       // requires location — disabled
      shabbatMevarchim: settings.holidays.roshChodesh,
      omer:             settings.holidays.omerCount,
      yomKippurKatan:   false,
      mask:             buildEventMask(settings.holidays),
    } as Parameters<typeof HebrewCalendar.calendar>[0]);

    // Index Hebrew events by date string for O(1) lookup during cell build
    const hebEventsByDate: Record<string, typeof hebEvents> = {};
    for (const ev of hebEvents) {
      const key = ev.getDate().greg().toISOString().slice(0, 10);
      (hebEventsByDate[key] ??= []).push(ev);
    }

    // Index user events by date string for O(1) lookup
    const userEventsByDate: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      (userEventsByDate[ev.date] ??= []).push(ev);
    }

    // ── Step 3: Build one DayInfo per cell ──
    const days: DayInfo[] = [];
    const cursor = new Date(startOfGrid);

    while (cursor <= endOfGrid) {
      const dateKey  = cursor.toISOString().slice(0, 10);
      const hd       = new HDate(cursor);
      const dayOfWeek = cursor.getDay();

      // isCurrentMonth determines whether to show the cell at full opacity
      let isCurrentMonth: boolean;
      if (settings.calendarMode === 'hebrew') {
        const viewHd = new HDate(viewDate);
        isCurrentMonth = hd.getMonth() === viewHd.getMonth() && hd.getFullYear() === viewHd.getFullYear();
      } else {
        isCurrentMonth = cursor.getMonth() === viewDate.getMonth();
      }

      days.push({
        date:            new Date(cursor),
        hDate:           hd,
        isToday:         cursor.getTime() === today.getTime(),
        isCurrentMonth,
        isShabbat:       dayOfWeek === 6,
        events:          userEventsByDate[dateKey]  ?? [],
        hebrewEvents:    hebEventsByDate[dateKey]   ?? [],
        hebrewDateStr:   `${gematriyaDay(hd.getDate())} ${hebrewMonthName(hd)}`,
        hebrewDateNumeral: gematriyaDay(hd.getDate()),
      });

      cursor.setDate(cursor.getDate() + 1); // advance one day
    }

    // ── Step 4: Build the month title strings ──
    const viewHd   = new HDate(viewDate);
    const gregTitle = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const hebTitle  = `${hebrewMonthName(viewHd)} ${viewHd.getFullYear()}`;

    return { days, title: gregTitle, hebrewTitle: hebTitle };

  }, [viewDate, settings, events]);

  return { days, title, hebrewTitle, viewDate, goToPrev, goToNext, goToToday };
}

/**
 * Build a bitmask of Hebrew event categories to include.
 * Each flag corresponds to a category from @hebcal/core's `flags` enum.
 * Returning `undefined` means "show everything" (no filter).
 */
function buildEventMask(holidays: typeof DEFAULT_HOLIDAYS) {
  let mask = 0;
  if (holidays.majorHolidays) mask |= flags.YOM_TOV_ENDS | flags.CHAG | flags.EREV;
  if (holidays.minorHolidays) mask |= flags.MINOR_FAST | flags.MODERN_HOLIDAY;
  if (holidays.roshChodesh)   mask |= flags.ROSH_CHODESH;
  if (holidays.israelHolidays) mask |= flags.IL_ONLY;
  if (holidays.shabbat)        mask |= flags.SHABBAT_MEVARCHIM;
  return mask || undefined; // undefined = no filter (show all)
}

/** Default holiday settings shape — used only for the TypeScript type of buildEventMask's param */
const DEFAULT_HOLIDAYS = {
  majorHolidays:  true,
  minorHolidays:  true,
  roshChodesh:    true,
  shabbat:        true,
  parashat:       true,
  dafYomi:        false,
  omerCount:      false,
  israelHolidays: true,
  diaspora:       false,
};

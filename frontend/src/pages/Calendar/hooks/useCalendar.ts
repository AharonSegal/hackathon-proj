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
import { type Todo } from '@/shared/hooks/useApi';

/** One cell in the calendar grid */
export interface DayInfo {
  date: Date;
  hDate: HDate;
  isToday: boolean;
  isCurrentMonth: boolean;  // false for padding days from adjacent months
  isShabbat: boolean;
  events: CalendarEvent[];  // user events on this day
  todos: Todo[];            // active todos with due_date on this day
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

export function useCalendar(events: CalendarEvent[], todos: Todo[] = []) {
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

  // ── Memo 1: grid bounds + Hebrew calendar data ────────────────────────────
  // Only recomputes when the month/settings change, NOT when user events change.
  const { startOfGrid, endOfGrid, hebEventsByDate, title, hebrewTitle, viewHdRef } = useMemo(() => {
    const weekStart = settings.weekStart;
    let startOfGrid: Date;
    let endOfGrid:   Date;

    // Step 1: Determine the first and last day of the visible month
    if (settings.calendarMode === 'hebrew') {
      const hd = new HDate(viewDate);
      const firstHDay = new HDate(1, hd.getMonth(), hd.getFullYear());
      const lastHDay  = new HDate(firstHDay.daysInMonth(), hd.getMonth(), hd.getFullYear());

      const firstGreg = firstHDay.greg();
      const lastGreg  = lastHDay.greg();

      const firstDow = (firstGreg.getDay() - weekStart + 7) % 7;
      startOfGrid = new Date(firstGreg);
      startOfGrid.setDate(startOfGrid.getDate() - firstDow);

      const lastDow = (lastGreg.getDay() - weekStart + 7) % 7;
      endOfGrid = new Date(lastGreg);
      endOfGrid.setDate(endOfGrid.getDate() + (6 - lastDow));

    } else {
      const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
      const lastDay  = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);

      const firstDow = (firstDay.getDay() - weekStart + 7) % 7;
      startOfGrid = new Date(firstDay);
      startOfGrid.setDate(startOfGrid.getDate() - firstDow);

      const lastDow = (lastDay.getDay() - weekStart + 7) % 7;
      endOfGrid = new Date(lastDay);
      endOfGrid.setDate(endOfGrid.getDate() + (6 - lastDow));
    }

    // Step 2: Hebrew holiday data for the grid range
    // candlelighting/havdalah are disabled (require location — shown on DailyTimes page).
    const hebEvents = HebrewCalendar.calendar({
      start:            startOfGrid,
      end:              endOfGrid,
      il:               !settings.holidays.diaspora,
      sedrot:           settings.holidays.parashat,
      candlelighting:   false,
      havdalah:         false,
      shabbatMevarchim: settings.holidays.roshChodesh,
      omer:             settings.holidays.omerCount,
      yomKippurKatan:   false,
      mask:             buildEventMask(settings.holidays),
    } as Parameters<typeof HebrewCalendar.calendar>[0]);

    const hebEventsByDate: Record<string, typeof hebEvents> = {};
    for (const ev of hebEvents) {
      const key = ev.getDate().greg().toISOString().slice(0, 10);
      (hebEventsByDate[key] ??= []).push(ev);
    }

    // Step 3: Title strings
    const viewHd    = new HDate(viewDate);
    const gregTitle = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const hebTitle  = `${hebrewMonthName(viewHd)} ${viewHd.getFullYear()}`;

    return { startOfGrid, endOfGrid, hebEventsByDate, title: gregTitle, hebrewTitle: hebTitle, viewHdRef: viewHd };
  }, [viewDate, settings]); // ← does NOT depend on events/todos

  // ── Memo 2: user events + todos indexed, then grid cells assembled ─────────
  // Recomputes instantly on any event/todo change (just O(n) array indexing,
  // no expensive Hebrew calendar computation).
  const days = useMemo(() => {
    // Index user events by date string for O(1) lookup
    const userEventsByDate: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      (userEventsByDate[ev.date] ??= []).push(ev);
    }

    // Index active todos by due_date for O(1) lookup
    const todosByDate: Record<string, Todo[]> = {};
    for (const todo of todos) {
      if (todo.dueDate && !todo.completed) {
        (todosByDate[todo.dueDate] ??= []).push(todo);
      }
    }

    // Build one DayInfo per cell
    const days: DayInfo[] = [];
    const cursor = new Date(startOfGrid);

    while (cursor <= endOfGrid) {
      const dateKey   = cursor.toISOString().slice(0, 10);
      const hd        = new HDate(cursor);
      const dayOfWeek = cursor.getDay();

      let isCurrentMonth: boolean;
      if (settings.calendarMode === 'hebrew') {
        isCurrentMonth = hd.getMonth() === viewHdRef.getMonth() && hd.getFullYear() === viewHdRef.getFullYear();
      } else {
        isCurrentMonth = cursor.getMonth() === viewDate.getMonth();
      }

      days.push({
        date:              new Date(cursor),
        hDate:             hd,
        isToday:           cursor.getTime() === today.getTime(),
        isCurrentMonth,
        isShabbat:         dayOfWeek === 6,
        events:            userEventsByDate[dateKey] ?? [],
        todos:             todosByDate[dateKey]       ?? [],
        hebrewEvents:      hebEventsByDate[dateKey]  ?? [],
        hebrewDateStr:     `${gematriyaDay(hd.getDate())} ${hebrewMonthName(hd)}`,
        hebrewDateNumeral: gematriyaDay(hd.getDate()),
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }, [startOfGrid, endOfGrid, hebEventsByDate, viewHdRef, viewDate, settings.calendarMode, events, todos]);

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

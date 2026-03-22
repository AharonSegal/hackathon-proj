import { useState, useMemo, useCallback } from 'react';
import { HDate, HebrewCalendar, months, flags } from '@hebcal/core';
import { useSettings } from '@/shared/context/SettingsContext';
import { CalendarEvent } from '@/shared/types/event.types';

export interface DayInfo {
  date: Date;
  hDate: HDate;
  isToday: boolean;
  isCurrentMonth: boolean;
  isShabbat: boolean;
  events: CalendarEvent[];
  hebrewEvents: ReturnType<typeof HebrewCalendar.calendar>;
  hebrewDateStr: string;
  hebrewDateNumeral: string;
}

const GEMATRIYA: Record<number, string> = {
  1: 'א', 2: 'ב', 3: 'ג', 4: 'ד', 5: 'ה', 6: 'ו', 7: 'ז', 8: 'ח', 9: 'ט',
  10: 'י', 11: 'יא', 12: 'יב', 13: 'יג', 14: 'יד', 15: 'טו', 16: 'טז',
  17: 'יז', 18: 'יח', 19: 'יט', 20: 'כ', 21: 'כא', 22: 'כב', 23: 'כג',
  24: 'כד', 25: 'כה', 26: 'כו', 27: 'כז', 28: 'כח', 29: 'כט', 30: 'ל',
};

export function gematriyaDay(day: number): string {
  return GEMATRIYA[day] ?? String(day);
}

const HEBREW_MONTH_NAMES: Record<number, string> = {
  [months.NISAN]: 'ניסן',
  [months.IYYAR]: 'אייר',
  [months.SIVAN]: 'סיון',
  [months.TAMUZ]: 'תמוז',
  [months.AV]: 'אב',
  [months.ELUL]: 'אלול',
  [months.TISHREI]: 'תשרי',
  [months.CHESHVAN]: 'חשון',
  [months.KISLEV]: 'כסלו',
  [months.TEVET]: 'טבת',
  [months.SHVAT]: 'שבט',
  [months.ADAR_I]: 'אדר א׳',
  [months.ADAR_II]: 'אדר ב׳',
};

export function hebrewMonthName(hDate: HDate): string {
  return HEBREW_MONTH_NAMES[hDate.getMonth()] ?? '';
}

export function useCalendar(events: CalendarEvent[]) {
  const { settings } = useSettings();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const goToPrev = useCallback(() => {
    if (settings.calendarMode === 'hebrew') {
      const hd = new HDate(viewDate);
      const prevMonth = hd.getMonth() === months.NISAN
        ? { month: months.ADAR_I, year: hd.getFullYear() - 1 }
        : { month: hd.getMonth() - 1, year: hd.getFullYear() };
      const prevFirst = new HDate(1, prevMonth.month, prevMonth.year);
      setViewDate(prevFirst.greg());
    } else {
      setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    }
  }, [settings.calendarMode, viewDate]);

  const goToNext = useCallback(() => {
    if (settings.calendarMode === 'hebrew') {
      const hd = new HDate(viewDate);
      let nextMonth = hd.getMonth() + 1;
      let nextYear = hd.getFullYear();
      const maxMonth = HDate.isLeapYear(nextYear) ? months.ADAR_II : months.ELUL;
      if (nextMonth > maxMonth) { nextMonth = months.TISHREI; nextYear++; }
      const nextFirst = new HDate(1, nextMonth, nextYear);
      setViewDate(nextFirst.greg());
    } else {
      setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    }
  }, [settings.calendarMode, viewDate]);

  const goToToday = useCallback(() => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }, []);

  const { days, title, hebrewTitle } = useMemo(() => {
    const weekStart = settings.weekStart;
    let startOfGrid: Date;
    let endOfGrid: Date;

    if (settings.calendarMode === 'hebrew') {
      const hd = new HDate(viewDate);
      const firstHDay = new HDate(1, hd.getMonth(), hd.getFullYear());
      const daysInMonth = firstHDay.daysInMonth();
      const lastHDay = new HDate(daysInMonth, hd.getMonth(), hd.getFullYear());

      const firstGreg = firstHDay.greg();
      const lastGreg = lastHDay.greg();

      // Pad to week boundaries
      const firstDow = (firstGreg.getDay() - weekStart + 7) % 7;
      startOfGrid = new Date(firstGreg);
      startOfGrid.setDate(startOfGrid.getDate() - firstDow);

      const lastDow = (lastGreg.getDay() - weekStart + 7) % 7;
      endOfGrid = new Date(lastGreg);
      endOfGrid.setDate(endOfGrid.getDate() + (6 - lastDow));
    } else {
      const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
      const lastDay = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);

      const firstDow = (firstDay.getDay() - weekStart + 7) % 7;
      startOfGrid = new Date(firstDay);
      startOfGrid.setDate(startOfGrid.getDate() - firstDow);

      const lastDow = (lastDay.getDay() - weekStart + 7) % 7;
      endOfGrid = new Date(lastDay);
      endOfGrid.setDate(endOfGrid.getDate() + (6 - lastDow));
    }

    // Build Hebrew events map for the grid range
    const hebEvents = HebrewCalendar.calendar({
      start: startOfGrid,
      end: endOfGrid,
      il: !settings.holidays.diaspora,
      sedrot: settings.holidays.parashat,
      candlelighting: settings.holidays.shabbat,
      havdalah: settings.holidays.shabbat,
      shabbatMevarchim: settings.holidays.roshChodesh,
      omer: settings.holidays.omerCount,
      yomKippurKatan: false,
      mask: buildEventMask(settings.holidays),
    } as Parameters<typeof HebrewCalendar.calendar>[0]);

    const hebEventsByDate: Record<string, typeof hebEvents> = {};
    for (const ev of hebEvents) {
      const key = ev.getDate().greg().toISOString().slice(0, 10);
      (hebEventsByDate[key] ??= []).push(ev);
    }

    // Build user events map
    const userEventsByDate: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      (userEventsByDate[ev.date] ??= []).push(ev);
    }

    // Build day cells
    const days: DayInfo[] = [];
    const cursor = new Date(startOfGrid);
    while (cursor <= endOfGrid) {
      const dateKey = cursor.toISOString().slice(0, 10);
      const hd = new HDate(cursor);
      const dayOfWeek = cursor.getDay();

      let isCurrentMonth: boolean;
      if (settings.calendarMode === 'hebrew') {
        const viewHd = new HDate(viewDate);
        isCurrentMonth = hd.getMonth() === viewHd.getMonth() && hd.getFullYear() === viewHd.getFullYear();
      } else {
        isCurrentMonth = cursor.getMonth() === viewDate.getMonth();
      }

      days.push({
        date: new Date(cursor),
        hDate: hd,
        isToday: cursor.getTime() === today.getTime(),
        isCurrentMonth,
        isShabbat: dayOfWeek === 6,
        events: userEventsByDate[dateKey] ?? [],
        hebrewEvents: hebEventsByDate[dateKey] ?? [],
        hebrewDateStr: `${gematriyaDay(hd.getDate())} ${hebrewMonthName(hd)}`,
        hebrewDateNumeral: gematriyaDay(hd.getDate()),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Build title
    const viewHd = new HDate(viewDate);
    const gregTitle = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const hebTitle = `${hebrewMonthName(viewHd)} ${viewHd.getFullYear()}`;

    return { days, title: gregTitle, hebrewTitle: hebTitle };
  }, [viewDate, settings, events]);

  return { days, title, hebrewTitle, viewDate, goToPrev, goToNext, goToToday };
}

function buildEventMask(holidays: typeof DEFAULT_HOLIDAYS) {
  let mask = 0;
  if (holidays.majorHolidays) mask |= flags.YOM_TOV_ENDS | flags.CHAG | flags.EREV;
  if (holidays.minorHolidays) mask |= flags.MINOR_FAST | flags.MODERN_HOLIDAY;
  if (holidays.roshChodesh) mask |= flags.ROSH_CHODESH;
  if (holidays.israelHolidays) mask |= flags.IL_ONLY;
  if (holidays.shabbat) mask |= flags.SHABBAT_MEVARCHIM;
  return mask || undefined;
}

const DEFAULT_HOLIDAYS = {
  majorHolidays: true,
  minorHolidays: true,
  roshChodesh: true,
  shabbat: true,
  parashat: true,
  dafYomi: false,
  omerCount: false,
  israelHolidays: true,
  diaspora: false,
};

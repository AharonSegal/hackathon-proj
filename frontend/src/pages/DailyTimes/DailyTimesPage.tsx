import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Sun, Moon } from 'lucide-react';
import { PageHeader } from '@/shared/components/Layout/PageHeader';
import { Button } from '@/shared/components/ui/Button';
import { useSettings } from '@/shared/context/SettingsContext';
import { HDate, HebrewCalendar } from '@hebcal/core';
import { ZmanimCalendar, GeoLocation } from 'kosher-zmanim';
import { gematriyaDay, hebrewMonthName } from '@/pages/Calendar/hooks/useCalendar';
import { clsx } from 'clsx';

interface ZmanRow {
  key: string;
  label: string;
  hebrewLabel: string;
  luxonTime: object | null; // Luxon DateTime
  highlight?: 'sunrise' | 'sunset';
}

function formatLuxonTime(dt: object | null, tz: string): string {
  if (!dt) return '—';
  try {
    // kosher-zmanim returns Luxon DateTime in UTC; convert to local timezone
    const luxon = dt as { toJSDate: () => Date };
    const jsDate = luxon.toJSDate();
    return jsDate.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: tz,
      hour12: false,
    });
  } catch {
    return '—';
  }
}

function buildZmanimCalc(date: Date, lat: number, lng: number, tz: string): ZmanimCalendar | null {
  try {
    const geo = new GeoLocation('Location', lat, lng, 0, tz);
    const cal = new ZmanimCalendar(geo);
    cal.setDate(date);
    return cal;
  } catch {
    return null;
  }
}

export function DailyTimesPage() {
  const { settings } = useSettings();
  const { location } = settings.zmanim;
  const [viewDate, setViewDate] = useState(new Date());

  const hDate = useMemo(() => new HDate(viewDate), [viewDate]);

  const parasha = useMemo(() => {
    try {
      const events = HebrewCalendar.calendar({
        start: viewDate,
        end: viewDate,
        il: !settings.holidays.diaspora,
        sedrot: true,
      } as Parameters<typeof HebrewCalendar.calendar>[0]);
      return events.find(e => e.getDesc().startsWith('Parashat') || e.getDesc().startsWith('Parasha'))?.getDesc() ?? null;
    } catch {
      return null;
    }
  }, [viewDate, settings.holidays.diaspora]);

  const calc = useMemo(
    () => buildZmanimCalc(viewDate, location.lat, location.lng, location.timezone),
    [viewDate, location],
  );

  const zmanim = useMemo((): ZmanRow[] => {
    if (!calc) return [];
    const z = settings.zmanim;
    const rows: ZmanRow[] = [];

    if (z.showAlotHashachar)
      rows.push({ key: 'alot', label: 'Alot HaShachar', hebrewLabel: 'עלות השחר', luxonTime: calc.getAlos72() });
    if (z.showMisheyakir)
      rows.push({ key: 'misheyakir', label: 'Misheyakir', hebrewLabel: 'משיכיר', luxonTime: null });
    if (z.showSunrise)
      rows.push({ key: 'sunrise', label: 'Sunrise (Hanetz)', hebrewLabel: 'הנץ החמה', luxonTime: calc.getSunrise(), highlight: 'sunrise' });
    if (z.showSofZmanShma)
      rows.push({ key: 'shma', label: 'Sof Zman Shma (GRA)', hebrewLabel: 'סוף זמן ק"ש גר"א', luxonTime: calc.getSofZmanShmaGRA() });
    if (z.showSofZmanTfilla)
      rows.push({ key: 'tfilla', label: 'Sof Zman Tfilla (GRA)', hebrewLabel: 'סוף זמן תפילה גר"א', luxonTime: calc.getSofZmanTfilaGRA() });
    if (z.showChatzot)
      rows.push({ key: 'chatzot', label: 'Chatzot (Midday)', hebrewLabel: 'חצות היום', luxonTime: calc.getChatzos() });
    if (z.showMinchaGedola)
      rows.push({ key: 'mincha_gedola', label: 'Mincha Gedola', hebrewLabel: 'מנחה גדולה', luxonTime: calc.getMinchaGedola() });
    if (z.showPlagHamincha)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rows.push({ key: 'plag', label: 'Plag HaMincha', hebrewLabel: 'פלג המנחה', luxonTime: (calc as any).getPlagHamincha() });
    if (z.showSunset)
      rows.push({ key: 'sunset', label: 'Sunset (Shkia)', hebrewLabel: 'שקיעת החמה', luxonTime: calc.getSunset(), highlight: 'sunset' });
    if (z.showTzet)
      rows.push({ key: 'tzet', label: 'Tzet HaKochavim', hebrewLabel: 'צאת הכוכבים', luxonTime: calc.getTzais() });
    if (z.showTzetShabbat)
      rows.push({ key: 'tzet_shabbat', label: "Tzet Shabbat (R\"T)", hebrewLabel: 'צאת שבת / ר"ת', luxonTime: calc.getTzais72() });

    return rows;
  }, [calc, settings.zmanim]);

  const dateLabel = viewDate.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const hDateLabel = `${gematriyaDay(hDate.getDate())} ${hebrewMonthName(hDate)} ${hDate.getFullYear()}`;

  const isToday = viewDate.toDateString() === new Date().toDateString();
  const dayOfWeek = viewDate.getDay();
  const isShabbat = dayOfWeek === 6;
  const isErevShabbat = dayOfWeek === 5;

  const stepDay = (delta: number) =>
    setViewDate(d => {
      const n = new Date(d);
      n.setDate(n.getDate() + delta);
      return n;
    });

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Daily Times"
        subtitle={`Zmanim for ${location.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setViewDate(new Date())}>
              Today
            </Button>
            <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden">
              <button onClick={() => stepDay(-1)} className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <div className="w-px h-5 bg-slate-700" />
              <button onClick={() => stepDay(1)} className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Date header */}
          <div className={clsx(
            'card flex items-center justify-between',
            isShabbat && 'border-violet-500/40 bg-violet-950/20',
            isErevShabbat && 'border-amber-500/40',
          )}>
            <div>
              <p className="text-lg font-semibold text-slate-100">{dateLabel}</p>
              <p className="text-sm text-slate-400 font-hebrew mt-0.5">{hDateLabel}</p>
              {parasha && <p className="text-xs text-primary-400 mt-1">{parasha}</p>}
            </div>
            <div className="text-right space-y-1.5">
              {isShabbat && <span className="badge bg-violet-500/20 text-violet-300 border-violet-500/30 border">Shabbat</span>}
              {isErevShabbat && <span className="badge bg-amber-500/20 text-amber-300 border-amber-500/30 border">Erev Shabbat</span>}
              {isToday && !isShabbat && !isErevShabbat && <span className="badge bg-primary-500/20 text-primary-300 border-primary-500/30 border">Today</span>}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 justify-end">
                <MapPin size={11} />
                {location.name}
              </div>
            </div>
          </div>

          {/* Zmanim table */}
          <div className="card overflow-hidden p-0">
            <div className="px-4 py-3 border-b border-slate-700">
              <h2 className="text-sm font-semibold text-slate-100">Zmanim</h2>
            </div>
            <div className="divide-y divide-slate-800">
              {zmanim.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">Enable zmanim in Settings to see times</p>
              ) : (
                zmanim.map(row => (
                  <div
                    key={row.key}
                    className={clsx(
                      'flex items-center justify-between px-4 py-3 hover:bg-slate-800/30 transition-colors',
                      row.highlight === 'sunrise' && 'bg-amber-950/20',
                      row.highlight === 'sunset' && 'bg-violet-950/20',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {row.highlight === 'sunrise' && <Sun size={14} className="text-amber-400" />}
                      {row.highlight === 'sunset' && <Moon size={14} className="text-violet-400" />}
                      {!row.highlight && <div className="w-3.5" />}
                      <div>
                        <p className="text-sm text-slate-200">{row.label}</p>
                        <p className="text-xs text-slate-500 font-hebrew">{row.hebrewLabel}</p>
                      </div>
                    </div>
                    <p className="text-sm font-mono font-semibold text-slate-100">
                      {formatLuxonTime(row.luxonTime, location.timezone)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

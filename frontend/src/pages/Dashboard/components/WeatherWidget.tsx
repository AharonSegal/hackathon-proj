import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Umbrella } from 'lucide-react';

interface DayWeather {
  date: string;
  weatherCode: number;
  tempMax: number;
  rainChance: number;
}

interface HourData {
  hour: number;
  weatherCode: number;
  temp: number;
  rain: number;
}

interface WeatherWidgetProps {
  lat: number;
  lng: number;
  unit: 'celsius' | 'fahrenheit';
}

const getWeatherIcon = (code: number) => {
  if (code <= 3)  return '01d';
  if (code <= 48) return '03d';
  if (code <= 67) return '09d';
  if (code <= 77) return '13d';
  return '10d';
};

function getNextDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Build a 24-hour window starting at currentHour for today, or hour 0 for future days. */
function getDisplayHours(
  date: string,
  hourlyMap: Record<string, HourData[]>,
  todayStr: string,
  currentHour: number,
): HourData[] {
  const isToday  = date === todayStr;
  const start    = isToday ? currentHour : 0;
  const dayHours = (hourlyMap[date] ?? []).filter(h => h.hour >= start);

  if (dayHours.length >= 24) return dayHours.slice(0, 24);

  // Pad with next day's hours if needed
  const nextHours = (hourlyMap[getNextDate(date)] ?? []).slice(0, 24 - dayHours.length);
  return [...dayHours, ...nextHours].slice(0, 24);
}

// ── Hourly Popup ──────────────────────────────────────────────────────────────

const POPUP_W = 480;
const POPUP_H = 128;

interface HourlyPopupProps {
  hours: HourData[];
  anchorRect: DOMRect;
  unit: 'celsius' | 'fahrenheit';
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function HourlyPopup({ hours, anchorRect, unit, onMouseEnter, onMouseLeave }: HourlyPopupProps) {
  const unitSymbol = unit === 'fahrenheit' ? '°F' : '°C';

  let left = anchorRect.left + anchorRect.width / 2 - POPUP_W / 2;
  let top  = anchorRect.top - POPUP_H - 14;

  if (left < 8) left = 8;
  if (left + POPUP_W > window.innerWidth - 8) left = window.innerWidth - POPUP_W - 8;
  const flipped = top < 8;
  if (flipped) top = anchorRect.bottom + 10;

  return createPortal(
    <div
      style={{ left, top, width: POPUP_W, zIndex: 9999 }}
      className="fixed"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Caret — top when popup is above card */}
      {!flipped && (
        <div style={{
          position: 'absolute', bottom: -6,
          left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid rgb(51 65 85)',
        }} />
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl px-3 py-2.5 overflow-x-auto no-scrollbar relative">
        <div className="flex gap-1 min-w-max">
          {hours.map((h, idx) => {
            const iconCode = getWeatherIcon(h.weatherCode);
            const label =
              h.hour === 0  ? '12a' :
              h.hour < 12   ? `${h.hour}a` :
              h.hour === 12 ? '12p' :
                              `${h.hour - 12}p`;
            return (
              <div key={idx} className="flex flex-col items-center gap-0.5 w-[44px] shrink-0">
                <span className="text-[10px] text-slate-500 font-medium">{label}</span>
                <img
                  src={`https://openweathermap.org/img/wn/${iconCode}.png`}
                  alt=""
                  className="w-7 h-7"
                />
                <span className="text-[11px] font-semibold text-slate-200">{h.temp}{unitSymbol}</span>
                <span className="text-[10px] text-blue-400 flex items-center gap-0.5">
                  <Umbrella size={8} />{h.rain}%
                </span>
              </div>
            );
          })}
        </div>

        {/* Fade-right hint */}
        <div className="pointer-events-none absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-slate-800 to-transparent rounded-r-xl" />
      </div>

      {/* Caret — bottom when popup is below card */}
      {flipped && (
        <div style={{
          position: 'absolute', top: -6,
          left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: '6px solid rgb(51 65 85)',
        }} />
      )}
    </div>,
    document.body
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function WeatherWidget({ lat, lng, unit }: WeatherWidgetProps) {
  const [days, setDays]           = useState<DayWeather[]>([]);
  const [hourlyMap, setHourlyMap] = useState<Record<string, HourData[]>>({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);

  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const cardRefs   = useRef<Record<string, HTMLDivElement | null>>({});
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setHoveredDay(null), 120);
  };
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  useEffect(() => {
    setLoading(true);
    setError(false);

    const tempUnit = unit === 'fahrenheit' ? 'fahrenheit' : 'celsius';
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&daily=weathercode,temperature_2m_max,precipitation_probability_max` +
      `&hourly=temperature_2m,weathercode,precipitation_probability` +
      `&timezone=auto&temperature_unit=${tempUnit}`;

    fetch(url)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        const d = data.daily;
        setDays(d.time.map((date: string, i: number) => ({
          date,
          weatherCode: d.weathercode[i],
          tempMax: Math.round(d.temperature_2m_max[i]),
          rainChance: d.precipitation_probability_max[i],
        })));

        const h = data.hourly;
        const map: Record<string, HourData[]> = {};
        (h.time as string[]).forEach((ts, i) => {
          const date = ts.slice(0, 10);
          const hour = parseInt(ts.slice(11, 13), 10);
          if (!map[date]) map[date] = [];
          map[date].push({
            hour,
            weatherCode: h.weathercode[i],
            temp: Math.round(h.temperature_2m[i]),
            rain: h.precipitation_probability[i] ?? 0,
          });
        });
        setHourlyMap(map);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [lat, lng, unit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center px-6 py-4 bg-slate-900/40 rounded-2xl border border-slate-800/60">
        <Loader2 className="animate-spin text-slate-500 w-5 h-5" />
      </div>
    );
  }

  if (error || days.length === 0) return null;

  const unitSymbol = unit === 'fahrenheit' ? '°F' : '°C';
  const todayStr   = new Date().toISOString().slice(0, 10);
  const currentHour = new Date().getHours();

  const displayHours = hoveredDay
    ? getDisplayHours(hoveredDay, hourlyMap, todayStr, currentHour)
    : [];

  return (
    <div className="bg-slate-900/40 rounded-2xl px-3 py-4 border border-slate-800/60 backdrop-blur-sm">
      <div className="flex items-stretch h-full gap-0 overflow-x-auto no-scrollbar">
        {days.map(day => {
          const date    = new Date(day.date + 'T00:00:00');
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          const iconCode = getWeatherIcon(day.weatherCode);

          return (
            <div
              key={day.date}
              ref={el => { cardRefs.current[day.date] = el; }}
              className={`flex flex-col items-center justify-between w-16 border-r border-slate-700/40 last:border-r-0 px-1.5 gap-1 cursor-default rounded-lg transition-colors ${
                hoveredDay === day.date ? 'bg-slate-800/60' : ''
              }`}
              onMouseEnter={() => {
                cancelClose();
                const el = cardRefs.current[day.date];
                if (el) setAnchorRect(el.getBoundingClientRect());
                setHoveredDay(day.date);
              }}
              onMouseLeave={scheduleClose}
            >
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{dayName}</span>
              <img
                src={`https://openweathermap.org/img/wn/${iconCode}@2x.png`}
                alt=""
                className="w-11 h-11"
              />
              <span className="text-sm font-bold text-slate-100">{day.tempMax}{unitSymbol}</span>
              <span className="text-[10px] text-blue-400 font-medium flex items-center gap-0.5">
                <Umbrella size={9} />
                {day.rainChance}%
              </span>
            </div>
          );
        })}
      </div>

      {hoveredDay && anchorRect && displayHours.length > 0 && (
        <HourlyPopup
          hours={displayHours}
          anchorRect={anchorRect}
          unit={unit}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      )}
    </div>
  );
}

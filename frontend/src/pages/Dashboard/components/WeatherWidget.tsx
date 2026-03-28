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
  hour: number;          // 0-23
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

// ── Hourly Popup ──────────────────────────────────────────────────────────────

interface HourlyPopupProps {
  hours: HourData[];
  anchorRect: DOMRect;
  unit: 'celsius' | 'fahrenheit';
}

function HourlyPopup({ hours, anchorRect, unit }: HourlyPopupProps) {
  const unitSymbol = unit === 'fahrenheit' ? '°F' : '°C';
  const popupWidth = 520;
  const popupHeight = 130;

  // Position above the card; clamp to viewport
  let left = anchorRect.left + anchorRect.width / 2 - popupWidth / 2;
  let top  = anchorRect.top - popupHeight - 10;

  if (left < 8) left = 8;
  if (left + popupWidth > window.innerWidth - 8) left = window.innerWidth - popupWidth - 8;
  if (top < 8) top = anchorRect.bottom + 10;

  return createPortal(
    <div
      style={{ left, top, width: popupWidth, zIndex: 9999 }}
      className="fixed pointer-events-none"
    >
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl px-3 py-2.5 overflow-x-auto no-scrollbar">
        <div className="flex gap-1.5 min-w-max">
          {hours.map(h => {
            const iconCode = getWeatherIcon(h.weatherCode);
            const label = h.hour === 0 ? '12a' : h.hour < 12 ? `${h.hour}a` : h.hour === 12 ? '12p' : `${h.hour - 12}p`;
            return (
              <div key={h.hour} className="flex flex-col items-center gap-0.5 w-12 shrink-0">
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
      </div>
      {/* Caret pointing down toward the card */}
      <div
        style={{
          position: 'absolute',
          bottom: top < anchorRect.top ? -6 : 'auto',
          top:    top > anchorRect.top ? -6 : 'auto',
          left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          ...(top < anchorRect.top
            ? { borderTop: '6px solid rgb(51 65 85)' }       // pointing down
            : { borderBottom: '6px solid rgb(51 65 85)' }),  // pointing up
        }}
      />
    </div>,
    document.body
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function WeatherWidget({ lat, lng, unit }: WeatherWidgetProps) {
  const [days, setDays]       = useState<DayWeather[]>([]);
  const [hourlyMap, setHourlyMap] = useState<Record<string, HourData[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const [hoveredDay, setHoveredDay]         = useState<string | null>(null);
  const [anchorRect, setAnchorRect]         = useState<DOMRect | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
      .then(r => { if (!r.ok) throw new Error('fetch failed'); return r.json(); })
      .then(data => {
        // Daily
        const d = data.daily;
        const result: DayWeather[] = d.time.map((date: string, i: number) => ({
          date,
          weatherCode: d.weathercode[i],
          tempMax: Math.round(d.temperature_2m_max[i]),
          rainChance: d.precipitation_probability_max[i],
        }));
        setDays(result);

        // Hourly — group by date
        const h = data.hourly;
        const map: Record<string, HourData[]> = {};
        (h.time as string[]).forEach((ts, i) => {
          const date = ts.slice(0, 10); // "2026-03-28"
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

  return (
    <div className="bg-slate-900/40 rounded-2xl px-3 py-4 border border-slate-800/60 backdrop-blur-sm relative">
      <div className="flex items-stretch h-full gap-0 overflow-x-auto no-scrollbar">
        {days.map((day) => {
          const date    = new Date(day.date + 'T00:00:00');
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          const iconCode = getWeatherIcon(day.weatherCode);
          const isHovered = hoveredDay === day.date;

          return (
            <div
              key={day.date}
              ref={el => { cardRefs.current[day.date] = el; }}
              className={`flex flex-col items-center justify-between w-16 border-r border-slate-700/40 last:border-r-0 px-1.5 gap-1 cursor-default rounded-lg transition-colors ${
                isHovered ? 'bg-slate-800/60' : ''
              }`}
              onMouseEnter={() => {
                const el = cardRefs.current[day.date];
                if (el) setAnchorRect(el.getBoundingClientRect());
                setHoveredDay(day.date);
              }}
              onMouseLeave={() => setHoveredDay(null)}
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

      {hoveredDay && anchorRect && hourlyMap[hoveredDay] && (
        <HourlyPopup
          hours={hourlyMap[hoveredDay]}
          anchorRect={anchorRect}
          unit={unit}
        />
      )}
    </div>
  );
}

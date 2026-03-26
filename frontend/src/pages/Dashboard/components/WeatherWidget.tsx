import { useEffect, useState } from 'react';
import { Loader2, Umbrella } from 'lucide-react';

interface DayWeather {
  date: string;
  weatherCode: number;
  tempMax: number;
  rainChance: number;
}

interface WeatherWidgetProps {
  lat: number;
  lng: number;
  unit: 'celsius' | 'fahrenheit';
}

const getWeatherIcon = (code: number) => {
  if (code <= 3) return '01d';
  if (code <= 48) return '03d';
  if (code <= 67) return '09d';
  if (code <= 77) return '13d';
  return '10d';
};

export function WeatherWidget({ lat, lng, unit }: WeatherWidgetProps) {
  const [days, setDays] = useState<DayWeather[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);

    const tempUnit = unit === 'fahrenheit' ? 'fahrenheit' : 'celsius';
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,precipitation_probability_max&timezone=auto&temperature_unit=${tempUnit}`
    )
      .then(r => {
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
      })
      .then(data => {
        const d = data.daily;
        const result: DayWeather[] = d.time.map((date: string, i: number) => ({
          date,
          weatherCode: d.weathercode[i],
          tempMax: Math.round(d.temperature_2m_max[i]),
          rainChance: d.precipitation_probability_max[i],
        }));
        setDays(result);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [lat, lng, unit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center px-6 py-3 bg-slate-900/40 rounded-2xl border border-slate-800/60">
        <Loader2 className="animate-spin text-slate-500 w-5 h-5" />
      </div>
    );
  }

  if (error || days.length === 0) return null;

  const unitSymbol = unit === 'fahrenheit' ? '°F' : '°C';

  return (
    <div className="bg-slate-900/40 rounded-2xl px-4 py-2.5 border border-slate-800/60 backdrop-blur-sm">
      <div className="flex items-stretch gap-0 overflow-x-auto no-scrollbar">
        {days.map((day, i) => {
          const date = new Date(day.date + 'T00:00:00');
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          const iconCode = getWeatherIcon(day.weatherCode);

          return (
            <div
              key={i}
              className="flex flex-col items-center justify-between w-16 border-r border-slate-700/40 last:border-r-0 px-2 py-1 gap-0.5"
            >
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{dayName}</span>
              <img
                src={`https://openweathermap.org/img/wn/${iconCode}@2x.png`}
                alt=""
                className="w-10 h-10 -my-1"
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
    </div>
  );
}

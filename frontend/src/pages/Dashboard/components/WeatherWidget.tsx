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
      <div className="flex items-center justify-center px-3 py-1">
        <Loader2 className="animate-spin text-slate-500 w-4 h-4" />
      </div>
    );
  }

  if (error || days.length === 0) return null;

  const unitSymbol = unit === 'fahrenheit' ? '°F' : '°C';

  return (
    <div className="bg-slate-900/40 rounded-xl px-2 py-1 border border-slate-800/60 backdrop-blur-sm">
      <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
        {days.map((day, i) => {
          const date = new Date(day.date + 'T00:00:00');
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          const iconCode = getWeatherIcon(day.weatherCode);

          return (
            <div
              key={i}
              className="flex flex-col items-center min-w-[46px] border-r border-slate-800/50 last:border-r-0 px-1"
            >
              <span className="text-[9px] font-bold text-slate-500 uppercase">{dayName}</span>
              <img
                src={`https://openweathermap.org/img/wn/${iconCode}.png`}
                alt=""
                className="w-6 h-6"
              />
              <span className="text-xs font-bold text-slate-100 leading-none">{day.tempMax}{unitSymbol}</span>
              <span className="text-[8px] text-blue-400 font-medium flex items-center gap-0.5 mt-0.5">
                <Umbrella size={6} />
                {day.rainChance}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

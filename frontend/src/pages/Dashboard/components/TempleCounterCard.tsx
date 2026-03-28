/**
 * TempleCounterCard.tsx
 * ----------------------
 * Displays the number of years since the destruction of the Second Temple.
 *
 * Calculation: current Hebrew year − 3828
 * (Hebrew year 3828 ≈ 68 CE, the year of the destruction)
 * e.g. 5786 − 3828 = 1,958
 */

import { useSettings } from '@/shared/context/SettingsContext';
import { ClockTheme } from '@/shared/types/settings.types';

const THEME_TEXT: Record<ClockTheme, string> = {
  purple:  'text-violet-400',
  blue:    'text-blue-400',
  amber:   'text-amber-400',
  emerald: 'text-emerald-400',
  rose:    'text-rose-400',
  slate:   'text-slate-300',
};

interface TempleCounterCardProps {
  hebrewYear: number;
}

export function TempleCounterCard({ hebrewYear }: TempleCounterCardProps) {
  const { settings } = useSettings();
  const yearsSince = hebrewYear - 3828;
  const formatted  = new Intl.NumberFormat('he-IL').format(yearsSince);
  const accent     = THEME_TEXT[settings.clock.theme];

  return (
    <div className="bg-slate-900/40 rounded-2xl border border-slate-800/60 backdrop-blur-sm px-4 py-3 flex flex-col items-center justify-center gap-1.5 min-w-[130px]">
      <p
        className="text-[10px] font-semibold text-slate-500 text-center leading-snug"
        dir="rtl"
        style={{ fontFamily: "'Heebo', sans-serif" }}
      >
        מניין השנים
        <br />
        מאז חורבן ביתנו
      </p>

      <p className={`text-4xl sm:text-5xl font-bold tabular-nums leading-none ${accent}`}>
        {formatted}
      </p>
    </div>
  );
}

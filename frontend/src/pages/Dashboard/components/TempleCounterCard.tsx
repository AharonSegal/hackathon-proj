/**
 * TempleCounterCard.tsx
 * ----------------------
 * Displays the number of years since the destruction of the Second Temple.
 *
 * Calculation: current Hebrew year − 3828
 * (Hebrew year 3828 ≈ 68 CE, the year of the destruction)
 * e.g. 5786 − 3828 = 1,958
 */

interface TempleCounterCardProps {
  hebrewYear: number;
}

export function TempleCounterCard({ hebrewYear }: TempleCounterCardProps) {
  const yearsSince = hebrewYear - 3828;
  const formatted  = new Intl.NumberFormat('he-IL').format(yearsSince);

  return (
    <div className="bg-slate-900/40 rounded-2xl border border-slate-800/60 backdrop-blur-sm px-5 py-5 flex flex-col items-center justify-center gap-2 min-w-[160px]">
      {/* Hebrew title */}
      <p
        className="text-[11px] font-semibold text-slate-500 text-center leading-snug"
        dir="rtl"
        style={{ fontFamily: "'Heebo', sans-serif" }}
      >
        מניין השנים
        <br />
        מאז חורבן ביתנו
      </p>

      {/* Year count */}
      <p className="text-4xl sm:text-5xl font-bold text-amber-400 tabular-nums leading-none">
        {formatted}
      </p>

      {/* Sub-label */}
      <p
        className="text-[10px] text-slate-600 text-center"
        dir="rtl"
        style={{ fontFamily: "'Heebo', sans-serif" }}
      >
        שנים מחורבן בית המקדש
      </p>
    </div>
  );
}

/**
 * ClockWidget.tsx
 * ----------------
 * Reads clock settings and renders 1–3 active SingleClock instances.
 * Sits beside WeatherWidget in the dashboard PageHeader actions slot.
 *
 * - Returns null immediately if clock is disabled — zero cost.
 * - Active clocks are those with entry.show === true.
 * - Layout: horizontal flex on sm+, stacks vertically on mobile for minimal style.
 */

import { useSettings } from '@/shared/context/SettingsContext';
import { SingleClock } from './SingleClock';

export function ClockWidget() {
  const { settings } = useSettings();
  const { clock } = settings;

  if (!clock.show) return null;

  const activeClocks = clock.clocks.filter(c => c.show);
  if (activeClocks.length === 0) return null;

  const isMinimal = clock.style === 'minimal';

  return (
    <div className="bg-slate-900/40 rounded-2xl border border-slate-800/60 backdrop-blur-sm overflow-hidden">
      <div className={`flex ${isMinimal ? 'flex-col divide-y divide-slate-800/60' : 'flex-row items-stretch'}`}>
        {activeClocks.map((entry, i) => (
          <SingleClock
            key={entry.tz + entry.label}
            entry={entry}
            style={clock.style}
            theme={clock.theme}
            showSeconds={clock.showSeconds}
            use24h={clock.use24h}
            isLast={i === activeClocks.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

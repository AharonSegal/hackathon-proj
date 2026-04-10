/**
 * OmerCounter — floating daily Omer-counting widget.
 *
 * Behaviour:
 * - Visible once per day; dismissed by clicking X (reappears tomorrow if not counted)
 * - "I Counted" marks today as counted (green check) without hiding the widget
 * - Invisible when outside the 49-day Omer period (auto-activates every year)
 *
 * Data:
 * - Primary: GET/POST /api/omer  (Turso DB singleton row)
 * - Fallback: localStorage key 'omer_dismissed_date' if API is unreachable
 *
 * Omer day calc: @hebcal/core  HDate + OmerEvent (already in project deps)
 * Hebrew text:   hebcal shabbat API → falls back to local OmerEvent.render('he')
 */

import { useState, useEffect, useCallback } from 'react';
import { HDate, OmerEvent, months } from '@hebcal/core';
import { X, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

// ── Types ──────────────────────────────────────────────────────────────────────

interface OmerStatus {
  lastDate:         string;
  countedToday:     boolean;
  countedYesterday: boolean;
  dismissedDate:    string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const api = axios.create({ baseURL: '/api', timeout: 8_000 });

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns 1-49 if today is within the Omer period, 0 otherwise.
 * Omer: 16 Nisan (day 1) → 5 Sivan (day 49)
 */
function getLocalOmerDay(): { omerDay: number; hdate: HDate } {
  const hdate = new HDate();
  const month = hdate.getMonth();
  const day   = hdate.getDate();

  let omerDay = 0;
  if (month === months.NISAN  && day >= 16) omerDay = day - 15;        // 1-15
  else if (month === months.IYYAR)          omerDay = 15 + day;        // 16-44
  else if (month === months.SIVAN && day <= 5) omerDay = 44 + day;     // 45-49

  return { omerDay, hdate };
}

function buildHebrewText(omerDay: number, hdate: HDate): string {
  try {
    return new OmerEvent(hdate, omerDay).render('he');
  } catch {
    return `יוֹם ${omerDay} לָעֹמֶר`;
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export function OmerCounter() {
  const [visible,    setVisible]    = useState(false);
  const [omerDay,    setOmerDay]    = useState(0);
  const [hebrewText, setHebrewText] = useState('');
  const [status,     setStatus]     = useState<OmerStatus | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [counting,   setCounting]   = useState(false);

  // ── Init on mount ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { omerDay: day, hdate } = getLocalOmerDay();

      // Outside Omer period — render nothing
      if (day === 0) { setLoading(false); return; }

      setOmerDay(day);
      let text = buildHebrewText(day, hdate);

      // Try to enrich Hebrew text from the public hebcal API
      try {
        const resp = await fetch(
          'https://www.hebcal.com/shabbat?cfg=json&geonameid=281184&M=on&omer=on',
          { signal: AbortSignal.timeout(4_000) },
        );
        if (resp.ok) {
          const data = await resp.json() as {
            items?: Array<{ category: string; hebrew?: string }>
          };
          const omerItem = data.items?.find(i => i.category === 'omer');
          if (omerItem?.hebrew) text = omerItem.hebrew;
        }
      } catch { /* use locally-generated text */ }

      if (cancelled) return;
      setHebrewText(text);

      // Fetch DB status; fall back to localStorage on network failure
      try {
        const { data } = await api.get<OmerStatus>('/omer');
        if (cancelled) return;
        setStatus(data);
        if (data.dismissedDate !== todayStr()) setVisible(true);
      } catch {
        const dismissed = localStorage.getItem('omer_dismissed_date');
        if (dismissed !== todayStr()) setVisible(true);
      }

      if (!cancelled) setLoading(false);
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleCount = useCallback(async () => {
    if (counting) return;
    setCounting(true);
    try {
      const { data } = await api.post<OmerStatus>('/omer', { action: 'count' });
      setStatus(data);
    } catch {
      // Optimistic update so the UI responds even if the API is down
      setStatus(prev => prev ? { ...prev, countedToday: true } : null);
    } finally {
      setCounting(false);
    }
  }, [counting]);

  const handleDismiss = useCallback(async () => {
    setVisible(false);
    try {
      await api.post('/omer', { action: 'dismiss' });
    } catch {
      localStorage.setItem('omer_dismissed_date', todayStr());
    }
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading || !visible || omerDay === 0) return null;

  const countedToday     = status?.countedToday     ?? false;
  const countedYesterday = status?.countedYesterday ?? false;

  return (
    <div
      role="dialog"
      aria-label="ספירת העומר"
      className="fixed bottom-20 right-4 z-[999] w-76 rounded-2xl shadow-2xl border border-amber-500/25 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 select-none"
      dir="rtl"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none" role="img" aria-label="wheat">🌾</span>
          <span className="text-amber-400 font-semibold text-sm tracking-wide">
            ספירת העומר
          </span>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="סגור"
          className="text-slate-500 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-700/60"
        >
          <X size={15} />
        </button>
      </div>

      {/* ── Day number ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center mb-3">
        <span className="text-5xl font-extrabold text-amber-400 leading-none tabular-nums">
          {omerDay}
        </span>
        <span className="text-xs text-slate-500 mt-1">מתוך 49 יום</span>
      </div>

      {/* ── Hebrew blessing text ───────────────────────────────────────────── */}
      <div className="bg-slate-700/40 rounded-xl px-4 py-3 mb-4 text-center border border-slate-600/30">
        <p
          className="text-slate-100 text-sm leading-relaxed font-medium"
          dir="rtl"
        >
          {hebrewText || '…'}
        </p>
      </div>

      {/* ── Yesterday / today indicators ───────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 text-xs px-1">
        <div className="flex items-center gap-1.5 text-slate-400">
          {countedYesterday ? (
            <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
          ) : (
            <span className="w-3 h-3 rounded-full border border-slate-600 inline-block shrink-0" />
          )}
          <span>אמש</span>
        </div>
        <div className="flex items-center gap-1.5">
          {countedToday ? (
            <>
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
              <span className="text-emerald-400">סָפַרְתָּ הַיּוֹם ✓</span>
            </>
          ) : (
            <span className="text-amber-400/80">טרם ספרת היום</span>
          )}
        </div>
      </div>

      {/* ── Count button / confirmed state ─────────────────────────────────── */}
      {countedToday ? (
        <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span className="text-emerald-400 text-sm font-semibold">כבר סָפַרְתִּי הַיּוֹם</span>
        </div>
      ) : (
        <button
          onClick={handleCount}
          disabled={counting}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold text-sm transition-colors duration-150 shadow-lg shadow-amber-900/30"
        >
          {counting ? '...' : 'סָפַרְתִּי — I Counted'}
        </button>
      )}
    </div>
  );
}

/**
 * shared/colors/index.ts
 * ----------------------
 * Central color palette for the entire app.
 *
 * - `colors` — brand/background/text/status hex values for use in inline styles or JS logic
 * - `EVENT_DOT_COLORS` — Tailwind bg classes for event color dots (small indicators)
 * - `EVENT_PILL_COLORS` — Tailwind bg classes for event pill backgrounds
 *
 * Use these constants instead of hardcoding colors in components.
 * Important: Tailwind JIT requires static strings — no dynamic interpolation.
 */
export const colors = {
  // Brand / Primary
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  primaryLight: '#818cf8',

  // Backgrounds
  bg: {
    main: '#0f172a',      // page background
    surface: '#1e293b',   // cards, panels
    elevated: '#334155',  // popovers, tooltips
    border: '#334155',
  },

  // Text
  text: {
    primary: '#f1f5f9',
    secondary: '#94a3b8',
    muted: '#64748b',
    inverse: '#0f172a',
  },

  // Status
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },

  // Communication channels
  channel: {
    whatsapp: '#25d366',
    email: '#3b82f6',
  },

  // Calendar-specific
  calendar: {
    today: '#6366f1',
    shabbat: '#8b5cf6',
    holiday: '#f59e0b',
    event: '#10b981',
    selected: '#4f46e5',
    roshChodesh: '#06b6d4',
  },
} as const;

export type AppColors = typeof colors;

/**
 * Tailwind class maps for event colors.
 * Defined here once so both DayCell and Dashboard use the same source.
 *
 * IMPORTANT: Must use static strings — Tailwind JIT cannot detect dynamic
 * interpolation like `bg-${color}-500`, so we pre-define every class here.
 */
export const EVENT_DOT_COLORS: Record<string, string> = {
  indigo:  'bg-indigo-400',
  emerald: 'bg-emerald-400',
  amber:   'bg-amber-400',
  rose:    'bg-rose-400',
  sky:     'bg-sky-400',
  violet:  'bg-violet-400',
};

export const EVENT_PILL_COLORS: Record<string, string> = {
  indigo:  'bg-indigo-500/90',
  emerald: 'bg-emerald-500/90',
  amber:   'bg-amber-500/90',
  rose:    'bg-rose-500/90',
  sky:     'bg-sky-500/90',
  violet:  'bg-violet-500/90',
};

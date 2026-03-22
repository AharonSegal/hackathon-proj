/**
 * App color palette — shared across all components.
 * Use these constants wherever you need colors outside Tailwind classes.
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

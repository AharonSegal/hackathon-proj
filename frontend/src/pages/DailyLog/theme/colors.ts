const colors = {
  bg: {
    primary: '#0d1117',
    secondary: '#161b22',
    tertiary: '#1c2333',
    elevated: '#21283b',
    hover: '#262d3d',
    active: '#2d3548',
  },
  border: {
    default: '#2a3142',
    light: '#333d52',
    focus: '#4f8ff7',
    error: '#f87171',
  },
  text: {
    primary: '#e6edf3',
    secondary: '#8b949e',
    tertiary: '#6e7681',
    inverse: '#0d1117',
    link: '#58a6ff',
  },
  accent: {
    primary: '#4f8ff7',
    hover: '#6ba1f9',
    active: '#3a7ce6',
    muted: 'rgba(79, 143, 247, 0.15)',
    subtle: 'rgba(79, 143, 247, 0.08)',
  },
  success: {
    primary: '#34d399',
    hover: '#4ade80',
    muted: 'rgba(52, 211, 153, 0.15)',
    text: '#34d399',
  },
  warning: {
    primary: '#f59e0b',
    hover: '#fbbf24',
    muted: 'rgba(245, 158, 11, 0.15)',
    text: '#f59e0b',
  },
  danger: {
    primary: '#f87171',
    hover: '#fca5a5',
    active: '#ef4444',
    muted: 'rgba(248, 113, 113, 0.15)',
    text: '#f87171',
  },
  purple: {
    primary: '#a78bfa',
    muted: 'rgba(167, 139, 250, 0.15)',
  },
  teal: {
    primary: '#2dd4bf',
    muted: 'rgba(45, 212, 191, 0.15)',
  },
  chart: [
    '#4f8ff7', '#34d399', '#f59e0b', '#a78bfa', '#f87171',
    '#2dd4bf', '#fb923c', '#818cf8', '#38bdf8', '#e879f9',
  ],
  scrollbar: {
    track: '#161b22',
    thumb: '#2a3142',
    thumbHover: '#3d4b63',
  },
  skeleton: {
    base: '#1c2333',
    shine: '#2a3142',
  },
} as const;

export type Colors = typeof colors;
export default colors;

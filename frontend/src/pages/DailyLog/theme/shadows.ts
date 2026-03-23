const shadows = {
  sm: '0 1px 3px rgba(0, 0, 0, 0.3)',
  md: '0 4px 12px rgba(0, 0, 0, 0.35)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.4)',
  xl: '0 12px 36px rgba(0, 0, 0, 0.45)',
  glow: {
    accent: '0 0 20px rgba(79, 143, 247, 0.25)',
    success: '0 0 20px rgba(52, 211, 153, 0.25)',
    danger: '0 0 20px rgba(248, 113, 113, 0.25)',
  },
  inset: 'inset 0 1px 3px rgba(0, 0, 0, 0.3)',
} as const;

export default shadows;

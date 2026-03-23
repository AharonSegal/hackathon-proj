const breakpoints = {
  mobile: '640px',
  tablet: '1024px',
  desktop: '1280px',
} as const;

export const media = {
  mobile: `@media (max-width: ${breakpoints.mobile})`,
  tablet: `@media (min-width: ${breakpoints.mobile}) and (max-width: ${breakpoints.tablet})`,
  desktop: `@media (min-width: ${breakpoints.tablet})`,
  aboveMobile: `@media (min-width: ${breakpoints.mobile})`,
} as const;

export default breakpoints;

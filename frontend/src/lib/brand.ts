/**
 * Fixed brand accents for the ERP dashboard hero section (sidebar, stat tiles, gauges).
 * These are intentionally NOT theme-variable — the reference design keeps the sidebar and
 * accent tiles a constant navy/orange/teal regardless of the light/dark toggle, which only
 * affects the main content surface (see globals.css / theme-store.ts).
 */
export const BRAND = {
  navyDark: '#0B1E3D',
  navy: '#16264A',
  navyLight: '#1E3A63',
  orange: '#F5821F',
  teal: '#14B8A6',
} as const;

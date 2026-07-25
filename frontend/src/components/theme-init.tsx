'use client';

import * as React from 'react';
import { hydrateThemeStore } from '@/stores/theme-store';

/** Syncs the Zustand theme store with the class the inline boot script (see layout.tsx) already applied. */
export function ThemeInit() {
  React.useEffect(() => {
    hydrateThemeStore();
  }, []);
  return null;
}

/** Blocking script injected before hydration so the correct theme class is present on first paint (no FOUC). */
export const THEME_BOOT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('sms_theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

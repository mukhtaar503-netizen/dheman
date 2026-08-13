import type { CSSProperties } from 'react';
import { BRAND } from '@/lib/brand';

/** Shared "surface on dark canvas" treatment — every dashboard panel (KPI cards, Quick
 *  Actions, Recent Activity, Business Overview) uses this same BRAND.navy fill + subtle
 *  white border so the whole page reads as one design system on the BRAND.navyDark background. */
export const surfaceClass = 'rounded-2xl border';
export const surfaceStyle: CSSProperties = { backgroundColor: BRAND.navy, borderColor: 'rgba(255,255,255,0.1)' };

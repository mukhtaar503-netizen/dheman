export type DateRangePreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface ResolvedRange {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
}

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfWeek(d: Date) {
  const copy = startOfDay(d);
  const day = copy.getDay(); // 0 = Sunday
  copy.setDate(copy.getDate() - day);
  return copy;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfQuarter(d: Date) {
  const quarterMonth = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), quarterMonth, 1);
}

function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}

/**
 * Resolves a dashboard date-range preset (Section 8.2 filters) into a concrete
 * [from, to] window plus the immediately preceding window of equal length, used
 * for period-over-period trend indicators on KPI cards.
 */
export function resolveDateRange(preset: DateRangePreset, customFrom?: Date, customTo?: Date, now = new Date()): ResolvedRange {
  let from: Date;
  const to = now;

  switch (preset) {
    case 'today':
      from = startOfDay(now);
      break;
    case 'week':
      from = startOfWeek(now);
      break;
    case 'quarter':
      from = startOfQuarter(now);
      break;
    case 'year':
      from = startOfYear(now);
      break;
    case 'custom':
      if (!customFrom || !customTo) throw new Error('customFrom and customTo are required for a custom range');
      return {
        from: customFrom,
        to: customTo,
        previousFrom: new Date(customFrom.getTime() - (customTo.getTime() - customFrom.getTime())),
        previousTo: customFrom,
      };
    case 'month':
    default:
      from = startOfMonth(now);
      break;
  }

  const durationMs = to.getTime() - from.getTime();
  const previousTo = from;
  const previousFrom = new Date(from.getTime() - durationMs);

  return { from, to, previousFrom, previousTo };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

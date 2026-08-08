import { create } from 'zustand';

export type DateRangePreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface DashboardFilterState {
  range: DateRangePreset;
  customFrom?: string;
  customTo?: string;
  customerId?: string;
  projectId?: string;
  technicianId?: string;
  serviceCategoryId?: string;
  paymentStatus?: string;
  projectStatus?: string;
  setRange: (range: DateRangePreset, customFrom?: string, customTo?: string) => void;
  setFilter: (key: 'customerId' | 'projectId' | 'technicianId' | 'serviceCategoryId' | 'paymentStatus' | 'projectStatus', value: string | undefined) => void;
  reset: () => void;
}

const DEFAULTS = {
  range: 'month' as DateRangePreset,
  customFrom: undefined,
  customTo: undefined,
  customerId: undefined,
  projectId: undefined,
  technicianId: undefined,
  serviceCategoryId: undefined,
  paymentStatus: undefined,
  projectStatus: undefined,
};

export const useDashboardFilterStore = create<DashboardFilterState>((set) => ({
  ...DEFAULTS,
  setRange: (range, customFrom, customTo) => set({ range, customFrom, customTo }),
  setFilter: (key, value) => set({ [key]: value }),
  reset: () => set(DEFAULTS),
}));

/** Builds a URLSearchParams-ready query object from the current filter state, for use as a TanStack Query key + fetch params. */
export function buildRangeParams(state: Pick<DashboardFilterState, 'range' | 'customFrom' | 'customTo'>) {
  const params: Record<string, string> = { range: state.range };
  if (state.range === 'custom' && state.customFrom && state.customTo) {
    params.from = state.customFrom;
    params.to = state.customTo;
  }
  return params;
}

/** Same as buildRangeParams, but subscribes to only the 3 fields it needs — so widgets that only
 * care about the date range (most dashboard charts/tiles) don't re-render when an unrelated
 * filter (customerId, technicianId, etc.) changes. */
export function useDashboardRangeParams() {
  const range = useDashboardFilterStore((s) => s.range);
  const customFrom = useDashboardFilterStore((s) => s.customFrom);
  const customTo = useDashboardFilterStore((s) => s.customTo);
  return buildRangeParams({ range, customFrom, customTo });
}

'use client';

import { useDashboardFilterStore, type DateRangePreset } from '@/stores/dashboard-filter-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
];

export function RangeFilter() {
  const { range, setRange, customFrom, customTo } = useDashboardFilterStore();

  return (
    <div className="flex flex-wrap items-center gap-1">
      {PRESETS.map((preset) => (
        <Button
          key={preset.value}
          size="sm"
          variant={range === preset.value ? 'default' : 'outline'}
          onClick={() => setRange(preset.value)}
        >
          {preset.label}
        </Button>
      ))}
      <input
        type="date"
        className={cn('h-8 rounded-md border border-border bg-background px-2 text-xs', range === 'custom' && 'ring-1 ring-ring')}
        value={customFrom ?? ''}
        onChange={(e) => setRange('custom', e.target.value, customTo)}
      />
      <span className="text-xs text-muted-foreground">to</span>
      <input
        type="date"
        className={cn('h-8 rounded-md border border-border bg-background px-2 text-xs', range === 'custom' && 'ring-1 ring-ring')}
        value={customTo ?? ''}
        onChange={(e) => setRange('custom', customFrom, e.target.value)}
      />
    </div>
  );
}

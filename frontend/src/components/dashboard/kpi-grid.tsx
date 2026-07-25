'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/dashboard-api';
import { useDashboardFilterStore, buildRangeParams } from '@/stores/dashboard-filter-store';
import { KpiCard } from './kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

function formatMetric(value: number | null | undefined, suffix = '') {
  if (value === null || value === undefined) return '—';
  return `${value.toLocaleString()}${suffix}`;
}

export function KpiGrid() {
  const filters = useDashboardFilterStore();
  const params = buildRangeParams(filters);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary', params],
    queryFn: () => dashboardApi.summary(params),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {data.cards.map((card) => (
          <KpiCard key={card.key} card={card} />
        ))}
      </div>

      {data.performance && (
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
            <Metric label="Net Profit" value={formatMetric(data.performance.netProfit)} prefix="$" />
            <Metric label="Completion Rate" value={formatMetric(data.performance.projectCompletionRatePercent, '%')} />
            <Metric label="Avg. Project Duration" value={formatMetric(data.performance.averageProjectDurationDays, ' days')} />
            <Metric label="Customer Satisfaction" value={formatMetric(data.performance.customerSatisfactionAverage, ' / 5')} />
            <Metric label="Outstanding Balance" value={formatMetric(data.performance.outstandingBalance)} prefix="$" />
            {data.performance.technicianOnTimeRatePercent !== undefined && (
              <Metric label="On-Time Rate" value={formatMetric(data.performance.technicianOnTimeRatePercent, '%')} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value, prefix }: { label: string; value: string; prefix?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">
        {prefix}
        {value}
      </p>
    </div>
  );
}

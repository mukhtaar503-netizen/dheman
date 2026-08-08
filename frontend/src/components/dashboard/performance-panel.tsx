'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/dashboard-api';
import { useDashboardRangeParams } from '@/stores/dashboard-filter-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgressRing } from './gauges/progress-ring';
import { SemiGauge } from './gauges/semi-gauge';
import { BRAND } from '@/lib/brand';

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(n, max));
}

export function PerformancePanel() {
  const params = useDashboardRangeParams();
  const { data, isLoading } = useQuery({ queryKey: ['dashboard-summary', params], queryFn: () => dashboardApi.summary(params) });

  const perf = data?.performance;
  const completionRate = perf?.projectCompletionRatePercent ?? 0;
  const satisfaction = perf?.customerSatisfactionAverage ?? null;
  const satisfactionPercent = satisfaction !== null ? clamp((satisfaction / 5) * 100) : 0;

  const revenue = perf?.monthlyRevenue ?? 0;
  const profitMarginIndex = revenue > 0 ? clamp(((perf?.netProfit ?? 0) / revenue) * 100) : 0;
  const collectionHealthIndex = revenue > 0 ? clamp(100 - ((perf?.outstandingBalance ?? 0) / revenue) * 100) : 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="flex justify-around">
              <ProgressRing value={completionRate} label={`${completionRate}%`} sublabel="Completion Rate" color={BRAND.orange} />
              <ProgressRing
                value={satisfactionPercent}
                label={satisfaction !== null ? satisfaction.toFixed(1) : '—'}
                sublabel="Satisfaction / 5"
                color={BRAND.teal}
              />
            </div>
            <div className="flex justify-around border-t border-border pt-4">
              <SemiGauge value={profitMarginIndex} label="Profit Margin Index" />
              <SemiGauge value={collectionHealthIndex} label="Collection Health" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

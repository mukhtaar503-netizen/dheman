'use client';

import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { dashboardApi } from '@/lib/dashboard-api';
import { useDashboardFilterStore, buildRangeParams } from '@/stores/dashboard-filter-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { exportToCsv } from '@/lib/csv-export';

export function RevenueChart() {
  const filters = useDashboardFilterStore();
  const params = buildRangeParams(filters);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-revenue', params],
    queryFn: () => dashboardApi.revenue(params),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Revenue Analytics</CardTitle>
        <Button variant="ghost" size="sm" disabled={!data?.length} onClick={() => data && exportToCsv('revenue.csv', data)}>
          <Download className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-64 w-full" />}
        {data && data.length === 0 && <EmptyState title="No revenue in this period" />}
        {data && data.length > 0 && (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => value.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revenueFill)" strokeWidth={2} animationDuration={400} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

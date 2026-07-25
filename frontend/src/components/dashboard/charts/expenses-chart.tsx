'use client';

import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { dashboardApi } from '@/lib/dashboard-api';
import { useDashboardFilterStore, buildRangeParams } from '@/stores/dashboard-filter-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { exportToCsv } from '@/lib/csv-export';

const CATEGORY_COLORS: Record<string, string> = {
  MATERIAL: '#60a5fa',
  LABOR: '#fbbf24',
  TRANSPORT: '#34d399',
  EQUIPMENT_RENTAL: '#a78bfa',
  OTHER: '#94a3b8',
};

export function ExpensesChart() {
  const filters = useDashboardFilterStore();
  const params = buildRangeParams(filters);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-expenses', params],
    queryFn: () => dashboardApi.expenses(params),
  });

  const categories = data && data.length > 0 ? Object.keys(data[0]).filter((k) => k !== 'period') : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Expense Analysis</CardTitle>
        <Button variant="ghost" size="sm" disabled={!data?.length} onClick={() => data && exportToCsv('expenses.csv', data)}>
          <Download className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-64 w-full" />}
        {data && data.length === 0 && <EmptyState title="No expenses in this period" />}
        {data && data.length > 0 && (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => value.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => String(v).replaceAll('_', ' ')} />
              {categories.map((category) => (
                <Line key={category} type="monotone" dataKey={category} stroke={CATEGORY_COLORS[category] ?? '#94a3b8'} strokeWidth={2} dot={false} animationDuration={400} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

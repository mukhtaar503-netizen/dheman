'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Download } from 'lucide-react';
import { dashboardApi } from '@/lib/dashboard-api';
import { useDashboardFilterStore, buildRangeParams } from '@/stores/dashboard-filter-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { exportToCsv } from '@/lib/csv-export';

const STATUS_COLORS: Record<string, string> = {
  PLANNING: '#94a3b8',
  SCHEDULED: '#60a5fa',
  IN_PROGRESS: '#fbbf24',
  ON_HOLD: '#f97316',
  COMPLETED: '#34d399',
  CLOSED: '#10b981',
  CANCELLED: '#ef4444',
};

export function ProjectsChart() {
  const filters = useDashboardFilterStore();
  const params = buildRangeParams(filters);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-projects', params],
    queryFn: () => dashboardApi.projects(params),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Project Statistics</CardTitle>
        <Button variant="ghost" size="sm" disabled={!data?.length} onClick={() => data && exportToCsv('projects.csv', data)}>
          <Download className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-64 w-full" />}
        {data && data.length === 0 && <EmptyState title="No projects in this period" />}
        {data && data.length > 0 && (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} tickFormatter={(v) => String(v).replaceAll('_', ' ')} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip labelFormatter={(v) => String(v).replaceAll('_', ' ')} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={400}>
                {data.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

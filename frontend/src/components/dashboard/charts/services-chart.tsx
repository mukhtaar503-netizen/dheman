'use client';

import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { dashboardApi } from '@/lib/dashboard-api';
import { api } from '@/lib/api-client';
import { useDashboardFilterStore } from '@/stores/dashboard-filter-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { exportToCsv } from '@/lib/csv-export';

const COLORS = ['#60a5fa', '#fbbf24', '#34d399', '#a78bfa', '#f472b6', '#94a3b8'];

interface ServiceCategory {
  id: string;
  name: string;
}

export function ServicesChart() {
  const serviceCategoryId = useDashboardFilterStore((s) => s.serviceCategoryId);
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-services'],
    queryFn: () => dashboardApi.services(),
  });
  const { data: categories } = useQuery({ queryKey: ['filter-service-categories'], queryFn: () => api.get<ServiceCategory[]>('/service-categories') });
  const selectedName = categories?.find((c) => c.id === serviceCategoryId)?.name;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Service Distribution</CardTitle>
        <Button variant="ghost" size="sm" disabled={!data?.length} onClick={() => data && exportToCsv('services.csv', data)}>
          <Download className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-64 w-full" />}
        {data && data.length === 0 && <EmptyState title="No project data yet" />}
        {data && data.length > 0 && (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label animationDuration={400}>
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={!selectedName || entry.name === selectedName ? 1 : 0.25}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

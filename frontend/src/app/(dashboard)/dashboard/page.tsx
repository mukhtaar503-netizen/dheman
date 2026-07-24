'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DashboardSummary = Record<string, number | null>;

function formatLabel(key: string) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get<DashboardSummary>('/reports/dashboard'),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {data &&
          Object.entries(data).map(([key, value]) => (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{formatLabel(key)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{value ?? '—'}</p>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}

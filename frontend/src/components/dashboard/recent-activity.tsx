'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogIn, UserPlus, FileText, CheckCircle2, Wallet } from 'lucide-react';
import { dashboardApi } from '@/lib/dashboard-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/ui/pagination';
import type { ActivityType } from '@/types';

const ICONS: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  LOGIN: LogIn,
  NEW_CUSTOMER: UserPlus,
  NEW_QUOTATION: FileText,
  PROJECT_COMPLETED: CheckCircle2,
  PAYMENT: Wallet,
};

const PAGE_SIZE = 8;

export function RecentActivity() {
  const [page, setPage] = React.useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-activity', page],
    queryFn: () => dashboardApi.activity(page, PAGE_SIZE),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-64 w-full" />}
        {data && data.items.length === 0 && <EmptyState title="No recent activity" />}
        {data && data.items.length > 0 && (
          <>
            <ul className="space-y-3">
              {data.items.map((event) => {
                const Icon = ICONS[event.type];
                return (
                  <li key={`${event.type}-${event.id}`} className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-muted p-1.5">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{event.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(event.at).toLocaleString()}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

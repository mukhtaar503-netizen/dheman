'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarClock, ListChecks } from 'lucide-react';
import { dashboardApi } from '@/lib/dashboard-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function UpcomingPanel() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard-upcoming'], queryFn: () => dashboardApi.upcoming() });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-24 w-full" />}
        {data && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" /> Next Milestone
              </p>
              <p className="mt-1 text-2xl font-semibold">{data.nextMilestone ? data.nextMilestone.daysLeft : '—'}</p>
              <p className="truncate text-xs text-muted-foreground">{data.nextMilestone?.label ?? 'None scheduled'}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ListChecks className="h-3.5 w-3.5" /> In Progress Tasks
              </p>
              <p className="mt-1 text-2xl font-semibold">{data.inProgressTaskCount}</p>
              <p className="text-xs text-muted-foreground">Next deadline in {data.nextDeadline ? `${data.nextDeadline.daysLeft}d` : '—'}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

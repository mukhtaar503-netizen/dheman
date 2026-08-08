'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import type { AuditLogEntry, PaginatedResult } from '@/types';

const ACTION_LABEL: Record<string, string> = {
  CREATE: 'Employee record created',
  UPDATE: 'Employee record updated',
  UPDATE_OWN_PROFILE: 'Updated their own profile',
};

export function EmployeeActivityTab({ employeeId }: { employeeId: string }) {
  const { user } = useAuth();
  const canView = user?.role === 'SUPER_ADMIN';

  const { data, isLoading } = useQuery({
    queryKey: ['employee-activity', employeeId],
    queryFn: () => api.get<PaginatedResult<AuditLogEntry>>(`/audit-logs?entityType=User&entityId=${employeeId}&pageSize=50`),
    enabled: canView,
  });

  if (!canView) {
    return <EmptyState title="Activity history is only visible to Super Admins" />;
  }

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const items = data?.items ?? [];
  if (items.length === 0) return <EmptyState title="No activity recorded yet" />;

  return (
    <ol className="space-y-4 border-l border-border pl-4">
      {items.map((entry) => (
        <li key={entry.id} className="relative">
          <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
          <p className="text-sm font-medium">{ACTION_LABEL[entry.action] ?? entry.action}</p>
          <p className="text-xs text-muted-foreground">
            {entry.actor?.fullName ?? 'System'} · {new Date(entry.createdAt).toLocaleString()}
          </p>
        </li>
      ))}
    </ol>
  );
}

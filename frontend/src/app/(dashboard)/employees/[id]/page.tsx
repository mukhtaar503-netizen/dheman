'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Pencil, PowerOff, RotateCcw } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmployeeOverviewTab } from '@/components/employees/employee-overview-tab';
import { EmployeeDocumentsTab } from '@/components/employees/employee-documents-tab';
import { EmployeeActivityTab } from '@/components/employees/employee-activity-tab';
import { EmptyState } from '@/components/empty-state';
import type { EmployeeDetail, UserStatus } from '@/types';

const STATUS_VARIANT: Record<UserStatus, 'success' | 'secondary' | 'destructive'> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  ON_LEAVE: 'destructive',
};

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => api.get<EmployeeDetail>(`/users/${id}`),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['employee', id] });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    queryClient.invalidateQueries({ queryKey: ['employee-statistics'] });
  };

  const statusMutation = useMutation({
    mutationFn: (status: UserStatus) => api.patch(`/users/${id}`, { status }),
    onSuccess: (_data, status) => {
      invalidate();
      toast({ title: `Employee marked ${status.replaceAll('_', ' ').toLowerCase()}` });
    },
    onError: (e) => toast({ title: 'Could not update status', description: e instanceof ApiError ? e.message : undefined, variant: 'destructive' }),
  });

  if (isLoading || !employee) {
    if (!isLoading && !employee) return <EmptyState title="Employee not found" />;
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{employee.fullName}</h1>
            <Badge variant={STATUS_VARIANT[employee.status]}>{employee.status.replaceAll('_', ' ')}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {employee.employeeId ?? 'No Employee ID'} · {employee.jobTitle ?? employee.role.replaceAll('_', ' ')}
            {employee.department ? ` · ${employee.department}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/employees/${id}/edit`}>
              <Pencil className="mr-1 h-4 w-4" /> Edit
            </Link>
          </Button>
          {employee.status === 'ACTIVE' && (
            <Button variant="outline" size="sm" onClick={() => statusMutation.mutate('ON_LEAVE')}>
              <CalendarClock className="mr-1 h-4 w-4" /> Mark On Leave
            </Button>
          )}
          {employee.status !== 'INACTIVE' ? (
            <Button variant="outline" size="sm" onClick={() => statusMutation.mutate('INACTIVE')}>
              <PowerOff className="mr-1 h-4 w-4" /> Deactivate
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => statusMutation.mutate('ACTIVE')}>
              <RotateCcw className="mr-1 h-4 w-4" /> Reactivate
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents ({employee.employeeDocuments.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <EmployeeOverviewTab employee={employee} />
        </TabsContent>
        <TabsContent value="documents">
          <EmployeeDocumentsTab employeeId={id} documents={employee.employeeDocuments} />
        </TabsContent>
        <TabsContent value="activity">
          <EmployeeActivityTab employeeId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

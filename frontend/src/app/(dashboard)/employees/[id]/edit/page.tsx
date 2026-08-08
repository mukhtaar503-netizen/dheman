'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeForm } from '@/components/employees/employee-form';
import type { EmployeeDetail } from '@/types';

export default function EditEmployeePage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => api.get<EmployeeDetail>(`/users/${id}`),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Edit Employee</h1>
      <Card>
        <CardHeader>
          <CardTitle>{data ? data.fullName : 'Loading…'}</CardTitle>
        </CardHeader>
        <CardContent>{isLoading || !data ? <Skeleton className="h-96 w-full" /> : <EmployeeForm employeeId={id} initial={data} />}</CardContent>
      </Card>
    </div>
  );
}

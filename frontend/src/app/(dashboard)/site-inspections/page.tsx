'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import type { InspectionStatus, SiteInspection } from '@/types';

const STATUS_VARIANT: Record<InspectionStatus, 'secondary' | 'default' | 'success' | 'destructive'> = {
  SCHEDULED: 'secondary',
  IN_PROGRESS: 'default',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
};

interface InspectionRow extends SiteInspection {
  serviceRequest?: {
    referenceNo: string;
    title?: string | null;
    customer?: { fullName: string };
    serviceCategory?: { name: string };
    service?: { serviceName: string } | null;
  };
}

export default function SiteInspectionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isInspector = user?.role === 'SITE_INSPECTOR';
  const [status, setStatus] = React.useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['site-inspections', { isInspector, status }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      const path = isInspector ? '/inspections/me' : `/inspections${params.toString() ? `?${params.toString()}` : ''}`;
      return api.get<InspectionRow[]>(path);
    },
    enabled: !!user,
  });

  const items = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Site Inspections</h1>
        {!isInspector && (
          <Button size="sm" onClick={() => router.push('/site-inspections/new')}>
            <Plus className="mr-1 h-4 w-4" /> New Inspection
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{data ? `${items.length} inspections` : 'Inspections'}</CardTitle>
          {!isInspector && (
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-56 w-full" />}
          {data && items.length === 0 && <EmptyState title="No inspections found" description="Schedule an inspection from a Service Request." />}
          {data && items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Estimated Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => router.push(`/site-inspections/${row.id}`)}>
                    <TableCell className="font-medium">{row.serviceRequest?.customer?.fullName ?? '—'}</TableCell>
                    <TableCell>{row.serviceRequest?.service?.serviceName ?? row.serviceRequest?.serviceCategory?.name ?? '—'}</TableCell>
                    <TableCell>{row.inspector?.fullName ?? '—'}</TableCell>
                    <TableCell>{new Date(row.scheduledAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[row.status]}>{row.status.replaceAll('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>{row.estimatedCost != null ? `$${Number(row.estimatedCost).toFixed(2)}` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

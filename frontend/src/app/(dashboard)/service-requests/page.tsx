'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/ui/pagination';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { PaginatedResult, ServiceRequest, ServiceRequestPriority, ServiceRequestStatistics, ServiceRequestStatus } from '@/types';

const STATUS_LABEL: Record<ServiceRequestStatus, string> = {
  NEW: 'New',
  UNDER_REVIEW: 'Under Review',
  SITE_INSPECTION_SCHEDULED: 'Inspection Scheduled',
  INSPECTION_COMPLETED: 'Inspection Completed',
  QUOTATION_SENT: 'Quotation Sent',
  APPROVED: 'Approved',
  CONVERTED_TO_PROJECT: 'Converted to Project',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  CLOSED: 'Closed',
};

const PRIORITY_VARIANT: Record<ServiceRequestPriority, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  URGENT: 'destructive',
  HIGH: 'default',
  MEDIUM: 'secondary',
  LOW: 'outline',
};

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatisticsRow() {
  const { data, isLoading } = useQuery({
    queryKey: ['service-request-statistics'],
    queryFn: () => api.get<ServiceRequestStatistics>('/service-requests/statistics'),
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatTile label="Total Requests" value={data.totalRequests} />
      <StatTile label="Pending" value={data.pendingRequests} />
      <StatTile label="Scheduled Inspections" value={data.scheduledInspections} />
      <StatTile label="Completed Inspections" value={data.completedInspections} />
      <StatTile
        label="Avg. Inspection Cost"
        value={data.averageInspectionCost != null ? `$${Number(data.averageInspectionCost).toFixed(2)}` : '—'}
      />
    </div>
  );
}

export default function ServiceRequestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isCustomer = user?.role === 'CUSTOMER';
  const isStaff = !isCustomer;

  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<string>('all');
  const [priority, setPriority] = React.useState<string>('all');
  const [sort, setSort] = React.useState('newest');
  const [page, setPage] = React.useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const pageSize = 20;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['service-requests', { isCustomer, search, status, priority, sort, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort });
      if (search) params.set('search', search);
      if (status !== 'all') params.set('status', status);
      if (priority !== 'all') params.set('priority', priority);
      const path = isCustomer ? `/service-requests/me?${params.toString()}` : `/service-requests?${params.toString()}`;
      return api.get<PaginatedResult<ServiceRequest>>(path);
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/service-requests/${id}`),
    onSuccess: () => {
      toast({ title: 'Service Request deleted' });
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['service-request-statistics'] });
    },
    onError: (error) => {
      toast({
        title: 'Could not delete request',
        description: error instanceof ApiError ? error.message : undefined,
        variant: 'destructive',
      });
      setConfirmDeleteId(null);
    },
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Service Requests</h1>
        <Button size="sm" onClick={() => router.push('/service-requests/new')}>
          <Plus className="mr-1 h-4 w-4" /> New Request
        </Button>
      </div>

      {isStaff && (
        <React.Suspense fallback={<Skeleton className="h-24 w-full" />}>
          <StatisticsRow />
        </React.Suspense>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{data ? `${data.total} requests` : 'Requests'}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search requests…"
              className="h-8 w-52 text-xs"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={priority}
              onValueChange={(v) => {
                setPriority(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="preferred_date">Preferred Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-56 w-full" />}
          {data && items.length === 0 && <EmptyState title="No service requests found" description="Try adjusting your search or filters." />}
          {data && items.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    {isStaff && <TableHead>Customer</TableHead>}
                    <TableHead>Service</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Preferred Date</TableHead>
                    {isStaff && <TableHead />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id} className="cursor-pointer" onClick={() => router.push(`/service-requests/${row.id}`)}>
                      <TableCell className="font-medium">{row.referenceNo}</TableCell>
                      {isStaff && <TableCell>{row.customer?.fullName ?? '—'}</TableCell>}
                      <TableCell>{row.service?.serviceName ?? row.serviceCategory?.name ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={PRIORITY_VARIANT[row.priority]}>{row.priority}</Badge>
                      </TableCell>
                      <TableCell>{STATUS_LABEL[row.status]}</TableCell>
                      <TableCell>{row.preferredDate ? new Date(row.preferredDate).toLocaleDateString() : '—'}</TableCell>
                      {isStaff && (
                        <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(row.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination page={page} pageSize={pageSize} total={data.total} onPageChange={setPage} />
            </>
          )}
        </CardContent>

        <AlertDialog open={confirmDeleteId !== null} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this Service Request?</AlertDialogTitle>
              <AlertDialogDescription>
                This cannot be undone. Requests that already have a Quotation can&apos;t be deleted — cancel or close them instead.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => confirmDeleteId && deleteMutation.mutate(confirmDeleteId)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  );
}

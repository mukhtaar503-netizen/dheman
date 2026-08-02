'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, FileEdit, FileText, Plus, Printer, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { openFileInNewTab } from '@/lib/download';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
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
import type { InspectionStatus, PaginatedResult, SiteInspection } from '@/types';

const STATUS_VARIANT: Record<InspectionStatus, 'secondary' | 'default' | 'outline' | 'success' | 'destructive'> = {
  PENDING: 'outline',
  SCHEDULED: 'secondary',
  IN_PROGRESS: 'default',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
};

interface InspectorOption {
  id: string;
  fullName: string;
}

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isInspector = user?.role === 'SITE_INSPECTOR';
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<string>('all');
  const [inspectorId, setInspectorId] = React.useState<string>('all');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['site-inspections', { isInspector, status, search, inspectorId, dateFrom, dateTo }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      if (search) params.set('search', search);
      if (inspectorId !== 'all') params.set('inspectorId', inspectorId);
      if (dateFrom) params.set('dateFrom', new Date(dateFrom).toISOString());
      if (dateTo) params.set('dateTo', new Date(dateTo).toISOString());
      const path = isInspector ? '/inspections/me' : `/inspections${params.toString() ? `?${params.toString()}` : ''}`;
      return api.get<InspectionRow[]>(path);
    },
    enabled: !!user,
  });

  const { data: inspectors } = useQuery({
    queryKey: ['inspectors-picker'],
    queryFn: () => api.get<PaginatedResult<InspectorOption>>('/users?role=SITE_INSPECTOR&pageSize=100'),
    enabled: !isInspector,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/inspections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-inspections'] });
      toast({ title: 'Inspection deleted' });
      setDeleteId(null);
    },
    onError: (error) => {
      toast({
        title: 'Could not delete this inspection',
        description: error instanceof ApiError ? error.message : undefined,
        variant: 'destructive',
      });
      setDeleteId(null);
    },
  });

  async function handlePrint(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await openFileInNewTab(`/inspections/${id}/pdf`);
    } catch (error) {
      toast({ title: 'Could not open the report', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
    }
  }

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
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>{data ? `${items.length} inspections` : 'Inspections'}</CardTitle>
          </div>
          {!isInspector && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <Input
                className="h-8 text-xs"
                placeholder="Search # / customer / project…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={inspectorId} onValueChange={setInspectorId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Inspector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All inspectors</SelectItem>
                  {inspectors?.items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input className="h-8 text-xs" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" />
              <Input className="h-8 text-xs" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-56 w-full" />}
          {data && items.length === 0 && <EmptyState title="No inspections found" description="Register a new Site Inspection to get started." />}
          {data && items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inspection #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => router.push(`/site-inspections/${row.id}`)}>
                    <TableCell className="font-mono text-xs">{row.inspectionNo}</TableCell>
                    <TableCell className="font-medium">{row.serviceRequest?.customer?.fullName ?? '—'}</TableCell>
                    <TableCell>{row.serviceRequest?.title ?? row.serviceRequest?.service?.serviceName ?? row.serviceRequest?.serviceCategory?.name ?? '—'}</TableCell>
                    <TableCell>{row.inspector?.fullName ?? '—'}</TableCell>
                    <TableCell>{new Date(row.scheduledAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[row.status]}>{row.status.replaceAll('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" title="View" onClick={() => router.push(`/site-inspections/${row.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!isInspector && (
                          <>
                            <Button variant="ghost" size="sm" title="Edit" onClick={() => router.push(`/site-inspections/${row.id}`)}>
                              <FileEdit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Print Report" onClick={(e) => handlePrint(row.id, e)}>
                              <Printer className="h-4 w-4" />
                            </Button>
                            {row.status === 'COMPLETED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Create Quotation"
                                onClick={() => router.push(`/quotations/new?siteInspectionId=${row.id}`)}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" title="Delete" onClick={() => setDeleteId(row.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this Site Inspection?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Inspections that already have a Quotation built from them cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

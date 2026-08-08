'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { downloadFile } from '@/lib/download';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
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
import type { PaginatedResult, Quotation, QuotationStatistics, QuotationStatus } from '@/types';

const STATUS_LABEL: Record<QuotationStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  REVISED: 'Revised',
  CANCELLED: 'Cancelled',
};

const STATUS_VARIANT: Record<QuotationStatus, 'secondary' | 'default' | 'success' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  SENT: 'default',
  APPROVED: 'success',
  REJECTED: 'destructive',
  EXPIRED: 'outline',
  REVISED: 'outline',
  CANCELLED: 'destructive',
};

const currency = (n: number | string) => Number(n).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

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
    queryKey: ['quotation-statistics'],
    queryFn: () => api.get<QuotationStatistics>('/quotations/statistics'),
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatTile label="Total Quotations" value={data.totalQuotations} />
      <StatTile label="Draft" value={data.draftQuotations} />
      <StatTile label="Sent" value={data.sentQuotations} />
      <StatTile label="Approved" value={data.approvedQuotations} />
      <StatTile label="Rejected" value={data.rejectedQuotations} />
      <StatTile label="Total Revenue" value={currency(data.totalRevenueValue)} />
    </div>
  );
}

export default function QuotationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isCustomer = user?.role === 'CUSTOMER';
  const isInspector = user?.role === 'SITE_INSPECTOR';
  const isStaff = !isCustomer && !isInspector;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = React.useState<string>('all');
  const [sort, setSort] = React.useState('newest');
  const [page, setPage] = React.useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const pageSize = 20;

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', { isCustomer, isInspector, search: debouncedSearch, status, sort, page }],
    queryFn: (): Promise<Quotation[] | PaginatedResult<Quotation>> => {
      if (isInspector) return api.get<Quotation[]>('/quotations/inspector/me');
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (status !== 'all') params.set('status', status);
      const path = isCustomer ? `/quotations/me?${params.toString()}` : `/quotations?${params.toString()}`;
      return api.get<PaginatedResult<Quotation>>(path);
    },
    enabled: !!user,
  });

  const items: Quotation[] = Array.isArray(data) ? data : (data?.items ?? []);
  const total = Array.isArray(data) ? data.length : (data?.total ?? 0);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/quotations/${id}`),
    onSuccess: () => {
      toast({ title: 'Quotation deleted' });
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation-statistics'] });
    },
    onError: (error) => {
      toast({ title: 'Could not delete quotation', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
      setConfirmDeleteId(null);
    },
  });

  async function handleDownload(q: Quotation, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const path = isCustomer ? `/quotations/me/${q.id}/pdf` : `/quotations/${q.id}/pdf`;
      await downloadFile(path, `${q.quotationNo}.pdf`);
    } catch (error) {
      toast({ title: 'Download failed', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quotations</h1>
        {isStaff && (
          <Button size="sm" onClick={() => router.push('/quotations/new')}>
            <Plus className="mr-1 h-4 w-4" /> New Quotation
          </Button>
        )}
      </div>

      {isStaff && (
        <React.Suspense fallback={<Skeleton className="h-24 w-full" />}>
          <StatisticsRow />
        </React.Suspense>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{total} quotations</CardTitle>
          {!isInspector && (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Search quotations…"
                className="h-8 w-52 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                value={status}
                onValueChange={(v) => {
                  setStatus(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-40 text-xs">
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
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="amount_high">Amount: High</SelectItem>
                  <SelectItem value="amount_low">Amount: Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-56 w-full" />}
          {!isLoading && items.length === 0 && <EmptyState title="No quotations found" description="Try adjusting your search or filters." />}
          {!isLoading && items.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quotation #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((q) => (
                    <TableRow key={q.id} className="cursor-pointer" onClick={() => router.push(`/quotations/${q.id}`)}>
                      <TableCell className="font-medium">{q.quotationNo}</TableCell>
                      <TableCell>{q.customer?.fullName ?? '—'}</TableCell>
                      <TableCell>{q.serviceRequest?.service?.serviceName ?? q.serviceRequest?.serviceCategory?.name ?? '—'}</TableCell>
                      <TableCell>{currency(q.total)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[q.status]}>{STATUS_LABEL[q.status]}</Badge>
                      </TableCell>
                      <TableCell>{new Date(q.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={(e) => handleDownload(q, e)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          {isStaff && q.status === 'DRAFT' && (
                            <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(q.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!isInspector && <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />}
            </>
          )}
        </CardContent>

        <AlertDialog open={confirmDeleteId !== null} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this Quotation?</AlertDialogTitle>
              <AlertDialogDescription>This cannot be undone. Only Draft quotations can be deleted.</AlertDialogDescription>
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

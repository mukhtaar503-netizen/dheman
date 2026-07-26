'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Download, Trash2, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import type { Customer, CustomerStatistics, PaginatedResult } from '@/types';

const STATUS_VARIANT: Record<string, 'success' | 'secondary' | 'destructive'> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  BLOCKED: 'destructive',
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
    queryKey: ['customer-statistics'],
    queryFn: () => api.get<CustomerStatistics>('/customers/statistics'),
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
      <StatTile label="Total Customers" value={data.totalCustomers} />
      <StatTile label="Active" value={data.activeCustomers} />
      <StatTile label="Inactive" value={data.inactiveCustomers} />
      <StatTile label="Business" value={data.businessCustomers} />
      <StatTile label="New This Month" value={data.newCustomersThisMonth} />
      <StatTile label="With Outstanding Balance" value={data.customersWithOutstandingPayments} />
    </div>
  );
}

function CustomersList() {
  const router = useRouter();
  const initialSearch = useSearchParams().get('search') ?? '';
  const [search, setSearch] = React.useState(initialSearch);
  const [type, setType] = React.useState<string>('all');
  const [status, setStatus] = React.useState<string>('all');
  const [sort, setSort] = React.useState('newest');
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = React.useState(false);
  const pageSize = 20;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryKey = ['customers', { search, type, status, sort, page }];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort });
      if (search) params.set('search', search);
      if (type !== 'all') params.set('type', type);
      if (status !== 'all') params.set('status', status);
      return api.get<PaginatedResult<Customer>>(`/customers?${params.toString()}`);
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    queryClient.invalidateQueries({ queryKey: ['customer-statistics'] });
  };

  const bulkStatusMutation = useMutation({
    mutationFn: (newStatus: string) => api.post('/customers/bulk/status', { ids: Array.from(selected), status: newStatus }),
    onSuccess: () => {
      toast({ title: `Updated ${selected.size} customer(s)` });
      setSelected(new Set());
      invalidate();
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: () => api.post('/customers/bulk/delete', { ids: Array.from(selected) }),
    onSuccess: () => {
      toast({ title: `Deleted ${selected.size} customer(s)` });
      setSelected(new Set());
      setConfirmBulkDelete(false);
      invalidate();
    },
  });

  const bulkRestoreMutation = useMutation({
    mutationFn: () => api.post('/customers/bulk/restore', { ids: Array.from(selected) }),
    onSuccess: () => {
      toast({ title: `Restored ${selected.size} customer(s)` });
      setSelected(new Set());
      invalidate();
    },
  });

  const items = data?.items ?? [];
  const allSelected = items.length > 0 && items.every((c) => selected.has(c.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((c) => c.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleExport() {
    const params = new URLSearchParams({ sort });
    if (search) params.set('search', search);
    if (type !== 'all') params.set('type', type);
    if (status !== 'all') params.set('status', status);
    const token = window.localStorage.getItem('sms_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
    const res = await fetch(`${apiUrl}/customers/export?${params.toString()}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) {
      toast({ title: 'Export failed', variant: 'destructive' });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{data ? `${data.total} customers` : 'Customers'}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search name, phone, email, code…"
            className="h-8 w-56 text-xs"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            value={type}
            onValueChange={(v) => {
              setType(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="INDIVIDUAL">Individual</SelectItem>
              <SelectItem value="CORPORATE">Business</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="BLOCKED">Blocked</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
              <SelectItem value="most_projects">Most Projects</SelectItem>
              <SelectItem value="highest_revenue">Highest Revenue</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
          <Button size="sm" onClick={() => router.push('/customers/new')}>
            <Plus className="mr-1 h-4 w-4" /> New Customer
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {selected.size > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/50 p-2 text-sm">
            <span className="font-medium">{selected.size} selected</span>
            <Button size="sm" variant="outline" onClick={() => bulkStatusMutation.mutate('ACTIVE')}>
              Mark Active
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkStatusMutation.mutate('INACTIVE')}>
              Mark Inactive
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkRestoreMutation.mutate()}>
              <RotateCcw className="mr-1 h-4 w-4" /> Restore
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setConfirmBulkDelete(true)}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
          </div>
        )}

        {isLoading && <Skeleton className="h-56 w-full" />}
        {data && items.length === 0 && <EmptyState title="No customers found" description="Try adjusting your search or filters." />}
        {data && items.length > 0 && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((customer) => (
                  <TableRow key={customer.id} className="cursor-pointer" onClick={() => router.push(`/customers/${customer.id}`)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(customer.id)} onCheckedChange={() => toggleOne(customer.id)} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{customer.customerCode}</TableCell>
                    <TableCell>
                      <Link href={`/customers/${customer.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                        {customer.fullName}
                      </Link>
                    </TableCell>
                    <TableCell>{customer.companyName ?? '—'}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer.email ?? '—'}</TableCell>
                    <TableCell>{customer.type === 'CORPORATE' ? 'Business' : 'Individual'}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[customer.status] ?? 'secondary'}>{customer.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageSize={pageSize} total={data.total} onPageChange={setPage} />
          </>
        )}
      </CardContent>

      <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} customer(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This is a soft delete — the records can be restored later. Any linked projects, quotations, or invoices are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => bulkDeleteMutation.mutate()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Customers</h1>
      <React.Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <StatisticsRow />
      </React.Suspense>
      <React.Suspense fallback={<Skeleton className="h-56 w-full" />}>
        <CustomersList />
      </React.Suspense>
    </div>
  );
}

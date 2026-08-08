'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
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
import type { PaginatedResult, Service, ServiceCategoryGroup, ServiceStatistics } from '@/types';

const CATEGORY_LABEL: Record<ServiceCategoryGroup, string> = {
  FURNITURE: 'Furniture Installation',
  ALUMINUM: 'Aluminum Installation',
  CCTV: 'CCTV Installation',
  PVC: 'PVC Installation',
  MOVING: 'Moving & Relocation Services',
};

const currency = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatisticsRow() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['service-statistics'],
    queryFn: () => api.get<ServiceStatistics>('/services/statistics'),
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

  const byCategory = new Map(data.byCategory.map((c) => [c.category, c.count]));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Total Services" value={data.totalServices} />
        <StatTile label="Active" value={data.activeServices} />
        <StatTile label="Inactive" value={data.inactiveServices} />
        <StatTile label="Furniture" value={byCategory.get('FURNITURE') ?? 0} />
        <StatTile label="Aluminum" value={byCategory.get('ALUMINUM') ?? 0} />
        <StatTile label="CCTV" value={byCategory.get('CCTV') ?? 0} />
        <StatTile label="PVC" value={byCategory.get('PVC') ?? 0} />
        <StatTile label="Moving & Relocation" value={byCategory.get('MOVING') ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recently Added Services</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentlyAdded.length === 0 && <p className="text-sm text-muted-foreground">No services yet.</p>}
            <ul className="divide-y divide-border">
              {data.recentlyAdded.map((service) => (
                <li
                  key={service.id}
                  className="flex cursor-pointer items-center justify-between py-2 text-sm hover:text-primary"
                  onClick={() => router.push(`/services/${service.id}`)}
                >
                  <span className="font-medium">{service.serviceName}</span>
                  <span className="text-xs text-muted-foreground">{CATEGORY_LABEL[service.category]}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most Frequently Used Services</CardTitle>
          </CardHeader>
          <CardContent>
            {data.mostFrequentlyUsed.length === 0 && <p className="text-sm text-muted-foreground">No usage data yet.</p>}
            <ul className="divide-y divide-border">
              {data.mostFrequentlyUsed.map((service) => (
                <li
                  key={service.id}
                  className="flex cursor-pointer items-center justify-between py-2 text-sm hover:text-primary"
                  onClick={() => router.push(`/services/${service.id}`)}
                >
                  <span className="font-medium">{service.serviceName}</span>
                  <Badge variant="secondary">{service.usageCount}× used</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ServicesList() {
  const router = useRouter();
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [category, setCategory] = React.useState<string>('all');
  const [status, setStatus] = React.useState<string>('all');
  const [sort, setSort] = React.useState('newest');
  const [page, setPage] = React.useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const pageSize = 20;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading } = useQuery({
    queryKey: ['services', { search: debouncedSearch, category, status, sort, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (category !== 'all') params.set('category', category);
      if (status !== 'all') params.set('status', status);
      return api.get<PaginatedResult<Service>>(`/services?${params.toString()}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/services/${id}`),
    onSuccess: () => {
      toast({ title: 'Service deleted' });
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['service-statistics'] });
    },
    onError: (error) => {
      toast({
        title: 'Could not delete service',
        description: error instanceof ApiError ? error.message : undefined,
        variant: 'destructive',
      });
      setConfirmDeleteId(null);
    },
  });

  const items = data?.items ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{data ? `${data.total} services` : 'Services'}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search services…"
            className="h-8 w-52 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="FURNITURE">Furniture Installation</SelectItem>
              <SelectItem value="ALUMINUM">Aluminum Installation</SelectItem>
              <SelectItem value="CCTV">CCTV Installation</SelectItem>
              <SelectItem value="PVC">PVC Installation</SelectItem>
              <SelectItem value="MOVING">Moving &amp; Relocation Services</SelectItem>
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
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
              <SelectItem value="cost_high">Highest Cost</SelectItem>
              <SelectItem value="cost_low">Lowest Cost</SelectItem>
              <SelectItem value="display_order">Display Order</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => router.push('/services/new')}>
            <Plus className="mr-1 h-4 w-4" /> New Service
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-56 w-full" />}
        {data && items.length === 0 && <EmptyState title="No services found" description="Try adjusting your search or filters." />}
        {data && items.length > 0 && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Estimated Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((service) => (
                  <TableRow key={service.id} className="cursor-pointer" onClick={() => router.push(`/services/${service.id}`)}>
                    <TableCell className="font-medium">{service.serviceName}</TableCell>
                    <TableCell>{CATEGORY_LABEL[service.category]}</TableCell>
                    <TableCell>{service.durationMinutes ? `${service.durationMinutes} min` : '—'}</TableCell>
                    <TableCell>{service.estimatedCost !== null && service.estimatedCost !== undefined ? currency(Number(service.estimatedCost)) : '—'}</TableCell>
                    <TableCell>
                      <Badge variant={service.status === 'ACTIVE' ? 'success' : 'secondary'}>{service.status}</Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(service.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
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
            <AlertDialogTitle>Delete this service?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Services linked to an active project can&apos;t be deleted — mark them Inactive instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDeleteId && deleteMutation.mutate(confirmDeleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default function ServicesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Services</h1>
      <React.Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <StatisticsRow />
      </React.Suspense>
      <React.Suspense fallback={<Skeleton className="h-56 w-full" />}>
        <ServicesList />
      </React.Suspense>
    </div>
  );
}

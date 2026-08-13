'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, Search, Wrench, CheckCircle2, XCircle, Tag, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
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
import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';
import { surfaceClass, surfaceStyle } from '@/components/dashboard/surface';
import type { PaginatedResult, Service, ServiceCategoryGroup, ServiceStatistics } from '@/types';

const CATEGORY_LABEL: Record<ServiceCategoryGroup, string> = {
  FURNITURE: 'Furniture Installation',
  ALUMINUM: 'Aluminum Installation',
  CCTV: 'CCTV Installation',
  PVC: 'PVC Installation',
  MOVING: 'Moving & Relocation Services',
};

const currency = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

// Dark-surface overrides for the shared shadcn controls — the rest of the app stays on the
// light theme, but this page (like the dashboard) reuses BRAND's fixed navy/orange palette.
const controlDark = 'border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-white/30 focus:ring-white/30';
const selectContentStyle = { backgroundColor: BRAND.navy } as React.CSSProperties;

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string }) {
  return (
    <div className={cn(surfaceClass, 'flex items-center gap-3 p-4')} style={surfaceStyle}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${BRAND.orange}22`, color: BRAND.orange }}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[22px] font-bold leading-none tracking-tight text-white">{value}</p>
        <p className="mt-1.5 truncate text-[13px] text-white/60">{label}</p>
      </div>
    </div>
  );
}

function SummaryCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['service-statistics'],
    queryFn: () => api.get<ServiceStatistics>('/services/statistics'),
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] w-full rounded-2xl bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard icon={Wrench} label="Total Services" value={data.totalServices} />
      <StatCard icon={CheckCircle2} label="Active" value={data.activeServices} />
      <StatCard icon={XCircle} label="Inactive" value={data.inactiveServices} />
      <StatCard icon={Tag} label="Categories" value={Object.keys(CATEGORY_LABEL).length} />
    </div>
  );
}

function Pager({ page, pageSize, total, onPageChange }: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-3 flex items-center justify-between text-xs text-white/50">
      <span>
        Page {page} of {totalPages} ({total} total)
      </span>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 bg-white/5 text-white hover:bg-white/10"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 bg-white/5 text-white hover:bg-white/10"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ServicesTable() {
  const router = useRouter();
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [category, setCategory] = React.useState<string>('all');
  const [status, setStatus] = React.useState<string>('all');
  const [page, setPage] = React.useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const pageSize = 20;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading } = useQuery({
    queryKey: ['services', { search: debouncedSearch, category, status, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
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
    <div className={cn(surfaceClass, 'p-5')} style={surfaceStyle}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative sm:w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <Input placeholder="Search services…" className={cn(controlDark, 'h-9 pl-8 text-sm')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v);
            setPage(1);
          }}
        >
          <SelectTrigger className={cn(controlDark, 'h-9 text-sm sm:w-48')}>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="border-white/10 text-white" style={selectContentStyle}>
            <SelectItem className="focus:bg-white/10" value="all">
              All categories
            </SelectItem>
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
              <SelectItem key={value} className="focus:bg-white/10" value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className={cn(controlDark, 'h-9 text-sm sm:w-36')}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="border-white/10 text-white" style={selectContentStyle}>
            <SelectItem className="focus:bg-white/10" value="all">
              All statuses
            </SelectItem>
            <SelectItem className="focus:bg-white/10" value="ACTIVE">
              Active
            </SelectItem>
            <SelectItem className="focus:bg-white/10" value="INACTIVE">
              Inactive
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <Skeleton className="h-56 w-full bg-white/5" />}

      {data && items.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <Inbox className="h-6 w-6 text-white/40" />
          <p className="text-sm font-medium text-white/70">No services found</p>
          <p className="text-xs text-white/40">Try adjusting your search or filters.</p>
        </div>
      )}

      {data && items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/50">Service</TableHead>
                <TableHead className="text-white/50">Category</TableHead>
                <TableHead className="text-white/50">Duration</TableHead>
                <TableHead className="text-white/50">Cost</TableHead>
                <TableHead className="text-white/50">Status</TableHead>
                <TableHead className="text-right text-white/50">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((service) => (
                <TableRow key={service.id} className="cursor-pointer border-white/10 text-white hover:bg-white/5" onClick={() => router.push(`/services/${service.id}`)}>
                  <TableCell className="font-medium">{service.serviceName}</TableCell>
                  <TableCell className="text-white/70">{CATEGORY_LABEL[service.category]}</TableCell>
                  <TableCell className="text-white/70">{service.durationMinutes ? `${service.durationMinutes} min` : '—'}</TableCell>
                  <TableCell className="text-white/70">
                    {service.estimatedCost !== null && service.estimatedCost !== undefined ? currency(Number(service.estimatedCost)) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={service.status === 'ACTIVE' ? 'success' : 'secondary'}>{service.status}</Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/60 hover:bg-white/10 hover:text-white"
                        aria-label="Edit service"
                        onClick={() => router.push(`/services/${service.id}/edit`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/60 hover:bg-white/10 hover:text-red-300"
                        aria-label="Delete service"
                        onClick={() => setConfirmDeleteId(service.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager page={page} pageSize={pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}

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
    </div>
  );
}

export default function ServicesPage() {
  const router = useRouter();

  return (
    <div className="-m-4 min-h-[calc(100vh-4rem)] p-4 sm:-m-6 sm:p-6 lg:p-8" style={{ backgroundColor: BRAND.navyDark }}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-white">Services</h1>
          <Button style={{ backgroundColor: BRAND.orange, color: BRAND.navyDark }} className="border-transparent" onClick={() => router.push('/services/new')}>
            <Plus className="mr-1.5 h-4 w-4" /> New Service
          </Button>
        </div>

        <React.Suspense fallback={<Skeleton className="h-20 w-full bg-white/5" />}>
          <SummaryCards />
        </React.Suspense>
        <React.Suspense fallback={<Skeleton className="h-56 w-full bg-white/5" />}>
          <ServicesTable />
        </React.Suspense>
      </div>
    </div>
  );
}

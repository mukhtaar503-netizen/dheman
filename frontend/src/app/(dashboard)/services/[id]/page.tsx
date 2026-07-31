'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { Service, ServiceCategoryGroup } from '@/types';

const CATEGORY_LABEL: Record<ServiceCategoryGroup, string> = {
  FURNITURE: 'Furniture Installation',
  ALUMINUM: 'Aluminum Installation',
  CCTV: 'CCTV Installation',
  PVC: 'PVC Installation',
  MOVING: 'Moving & Relocation Services',
};

const currency = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? '—'}</p>
    </div>
  );
}

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', id],
    queryFn: () => api.get<Service>(`/services/${id}`),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['service', id] });
    queryClient.invalidateQueries({ queryKey: ['services'] });
    queryClient.invalidateQueries({ queryKey: ['service-statistics'] });
  };

  const toggleStatusMutation = useMutation({
    mutationFn: () => api.post(`/services/${id}/${service?.status === 'ACTIVE' ? 'deactivate' : 'activate'}`),
    onSuccess: () => {
      invalidate();
      toast({ title: service?.status === 'ACTIVE' ? 'Service deactivated' : 'Service activated' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.del(`/services/${id}`),
    onSuccess: () => {
      invalidate();
      setConfirmDelete(false);
      toast({ title: 'Service deleted' });
      router.push('/services');
    },
    onError: (error) => {
      toast({
        title: 'Could not delete service',
        description: error instanceof ApiError ? error.message : undefined,
        variant: 'destructive',
      });
      setConfirmDelete(false);
    },
  });

  if (isLoading || !service) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{service.serviceName}</h1>
            <Badge variant={service.status === 'ACTIVE' ? 'success' : 'secondary'}>{service.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{CATEGORY_LABEL[service.category]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/services/${id}/edit`}>
              <Pencil className="mr-1 h-4 w-4" /> Edit
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => toggleStatusMutation.mutate()}>
            {service.status === 'ACTIVE' ? (
              <>
                <PowerOff className="mr-1 h-4 w-4" /> Deactivate
              </>
            ) : (
              <>
                <Power className="mr-1 h-4 w-4" /> Activate
              </>
            )}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Description" value={service.description} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Category" value={CATEGORY_LABEL[service.category]} />
            <Field label="Duration" value={service.durationMinutes ? `${service.durationMinutes} minutes` : undefined} />
            <Field
              label="Estimated cost"
              value={service.estimatedCost !== null && service.estimatedCost !== undefined ? currency(Number(service.estimatedCost)) : undefined}
            />
            <Field label="Status" value={service.status} />
            <Field label="Display order" value={service.displayOrder} />
            <Field label="Created Date" value={new Date(service.createdAt).toLocaleDateString()} />
            <Field label="Updated Date" value={new Date(service.updatedAt).toLocaleDateString()} />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Required materials</p>
            {service.requiredMaterials.length === 0 ? (
              <p className="text-sm text-muted-foreground">None specified</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {service.requiredMaterials.map((m) => (
                  <Badge key={m} variant="outline">
                    {m}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Included features</p>
            {service.features.length === 0 ? (
              <p className="text-sm text-muted-foreground">None specified</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {service.features.map((f) => (
                  <Badge key={f} variant="outline">
                    {f}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          {service.notes && <Field label="Notes" value={service.notes} />}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {service.serviceName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. If this service is linked to an active project, deletion will be blocked — mark it Inactive instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

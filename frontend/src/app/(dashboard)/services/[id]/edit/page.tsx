'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ServiceForm } from '@/components/services/service-form';
import type { Service } from '@/types';

export default function EditServicePage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['service', id],
    queryFn: () => api.get<Service>(`/services/${id}`),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Edit Service</h1>
      <Card>
        <CardHeader>
          <CardTitle>{data ? data.serviceName : 'Loading…'}</CardTitle>
        </CardHeader>
        <CardContent>{isLoading || !data ? <Skeleton className="h-96 w-full" /> : <ServiceForm serviceId={id} initial={data} />}</CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomerForm } from '@/components/customers/customer-form';
import type { CustomerDetail } from '@/types';

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get<CustomerDetail>(`/customers/${id}`),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Edit Customer</h1>
      <Card>
        <CardHeader>
          <CardTitle>{data ? data.fullName : 'Loading…'}</CardTitle>
        </CardHeader>
        <CardContent>{isLoading || !data ? <Skeleton className="h-96 w-full" /> : <CustomerForm customerId={id} initial={data} />}</CardContent>
      </Card>
    </div>
  );
}

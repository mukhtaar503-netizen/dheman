'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ServiceRequestRow {
  id: string;
  referenceNo: string;
  description: string;
  status: string;
  customer?: { fullName: string };
  serviceCategory?: { name: string };
}

export default function ServiceRequestsPage() {
  const { user } = useAuth();
  const isCustomer = user?.role === 'CUSTOMER';

  const { data, isLoading } = useQuery({
    queryKey: ['service-requests', isCustomer],
    queryFn: () =>
      isCustomer
        ? api.get<ServiceRequestRow[]>('/service-requests/me')
        : api.get<{ items: ServiceRequestRow[] }>('/service-requests?page=1&pageSize=20').then((r) => r.items),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Service Requests</h1>
      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Loading…</p>}
          {data && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  {!isCustomer && <TableHead>Customer</TableHead>}
                  <TableHead>Service</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.referenceNo}</TableCell>
                    {!isCustomer && <TableCell>{row.customer?.fullName ?? '—'}</TableCell>}
                    <TableCell>{row.serviceCategory?.name ?? '—'}</TableCell>
                    <TableCell className="max-w-xs truncate">{row.description}</TableCell>
                    <TableCell>{row.status.replaceAll('_', ' ')}</TableCell>
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

'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import type { Customer, PaginatedResult } from '@/types';

function CustomersList() {
  const initialSearch = useSearchParams().get('search') ?? '';
  const [search, setSearch] = React.useState(initialSearch);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => api.get<PaginatedResult<Customer>>(`/customers?page=1&pageSize=20${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>{data ? `${data.total} customers` : 'Customers'}</CardTitle>
        <Input placeholder="Search…" className="h-8 w-48 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-56 w-full" />}
        {data && data.items.length === 0 && <EmptyState title="No customers found" />}
        {data && data.items.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>{customer.fullName}</TableCell>
                  <TableCell>{customer.companyName ?? '—'}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>{customer.email ?? '—'}</TableCell>
                  <TableCell>{customer.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function CustomersPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Customers</h1>
      <React.Suspense fallback={<Skeleton className="h-56 w-full" />}>
        <CustomersList />
      </React.Suspense>
    </div>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Customer, PaginatedResult } from '@/types';

export default function CustomersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get<PaginatedResult<Customer>>('/customers?page=1&pageSize=20'),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Customers</h1>
      <Card>
        <CardHeader>
          <CardTitle>{data ? `${data.total} customers` : 'Customers'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Loading…</p>}
          {data && (
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
    </div>
  );
}

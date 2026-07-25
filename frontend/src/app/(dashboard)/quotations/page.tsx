'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import type { PaginatedResult } from '@/types';

interface QuotationRow {
  id: string;
  quotationNo: string;
  status: string;
  total: string | number;
  customer: { fullName: string };
  createdAt: string;
}

export default function QuotationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => api.get<PaginatedResult<QuotationRow>>('/quotations?page=1&pageSize=20'),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Quotations</h1>
      <Card>
        <CardHeader>
          <CardTitle>{data ? `${data.total} quotations` : 'Quotations'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-40 w-full" />}
          {data && data.items.length === 0 && <EmptyState title="No quotations found" />}
          {data && data.items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{q.quotationNo}</TableCell>
                    <TableCell>{q.customer.fullName}</TableCell>
                    <TableCell>{Number(q.total).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{q.status.replaceAll('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>{new Date(q.createdAt).toLocaleDateString()}</TableCell>
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

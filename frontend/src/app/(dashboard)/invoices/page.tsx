'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import type { PaginatedResult } from '@/types';

interface InvoiceRow {
  id: string;
  invoiceNo: string;
  status: string;
  total: string | number;
  balance: string | number;
  dueDate: string;
}

const STATUS_VARIANT: Record<string, 'secondary' | 'success' | 'destructive'> = {
  PAID: 'success',
  OVERDUE: 'destructive',
};

export default function InvoicesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.get<PaginatedResult<InvoiceRow>>('/invoices?page=1&pageSize=20'),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Invoices & Payments</h1>
      <Card>
        <CardHeader>
          <CardTitle>{data ? `${data.total} invoices` : 'Invoices'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-40 w-full" />}
          {data && data.items.length === 0 && <EmptyState title="No invoices found" />}
          {data && data.items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoiceNo}</TableCell>
                    <TableCell>{Number(inv.total).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</TableCell>
                    <TableCell>{Number(inv.balance).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[inv.status] ?? 'secondary'}>{inv.status.replaceAll('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>{new Date(inv.dueDate).toLocaleDateString()}</TableCell>
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

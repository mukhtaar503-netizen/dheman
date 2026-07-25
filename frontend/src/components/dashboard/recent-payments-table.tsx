'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowUpDown } from 'lucide-react';
import { dashboardApi } from '@/lib/dashboard-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/ui/pagination';

const PAGE_SIZE = 6;

export function RecentPaymentsTable() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'paidAt' | 'amount'>('paidAt');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-payments', page, search, sortBy, sortOrder],
    queryFn: () => dashboardApi.payments({ page, pageSize: PAGE_SIZE, search: search || undefined, sortBy, sortOrder }),
  });

  function toggleSort(column: 'paidAt' | 'amount') {
    if (sortBy === column) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Recent Payments</CardTitle>
        <div className="relative w-40 sm:w-56">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-7 text-xs"
            placeholder="Search…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-56 w-full" />}
        {data && data.items.length === 0 && <EmptyState title="No payments found" />}
        {data && data.items.length > 0 && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1" onClick={() => toggleSort('amount')}>
                      Amount <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1" onClick={() => toggleSort('paidAt')}>
                      Date <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.invoice.invoiceNo}</TableCell>
                    <TableCell>{p.customer.fullName}</TableCell>
                    <TableCell>{Number(p.amount).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.method.replaceAll('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>{new Date(p.paidAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

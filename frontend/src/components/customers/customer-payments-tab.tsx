import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import type { CustomerDetail } from '@/types';

const currency = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

export function CustomerPaymentsTab({ customer }: { customer: CustomerDetail }) {
  const isOverdue = (inv: CustomerDetail['invoices'][number]) => inv.status !== 'PAID' && new Date(inv.dueDate) < new Date() && Number(inv.balance) > 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Total Invoiced</p>
          <p className="text-xl font-semibold">{currency(customer.stats.totalInvoiced)}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Total Paid</p>
          <p className="text-xl font-semibold">{currency(customer.stats.totalPaid)}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Outstanding Balance</p>
          <p className="text-xl font-semibold text-destructive">{currency(customer.stats.outstandingBalance)}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Overdue Invoices</p>
          <p className="text-xl font-semibold">{customer.stats.overdueInvoiceCount}</p>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Invoices</h3>
        {customer.invoices.length === 0 ? (
          <EmptyState title="No invoices yet" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customer.invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <Link href={`/invoices/${inv.id}`} className="hover:underline">
                      {inv.invoiceNo}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={isOverdue(inv) ? 'destructive' : inv.status === 'PAID' ? 'success' : 'secondary'}>
                      {isOverdue(inv) ? 'OVERDUE' : inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{currency(Number(inv.total))}</TableCell>
                  <TableCell>{currency(Number(inv.balance))}</TableCell>
                  <TableCell>{new Date(inv.dueDate).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Payment Timeline</h3>
        {customer.paymentTimeline.length === 0 ? (
          <EmptyState title="No payments recorded" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Running Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customer.paymentTimeline.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.paidAt).toLocaleDateString()}</TableCell>
                  <TableCell>{currency(Number(p.amount))}</TableCell>
                  <TableCell>{p.method}</TableCell>
                  <TableCell>{p.referenceNo ?? '—'}</TableCell>
                  <TableCell>{currency(Number(p.runningBalance))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

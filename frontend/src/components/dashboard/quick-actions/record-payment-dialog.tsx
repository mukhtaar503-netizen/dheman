'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PaginatedResult } from '@/types';

interface InvoiceOption {
  id: string;
  invoiceNo: string;
  status: string;
  balance: string | number;
}

const OUTSTANDING = new Set(['SENT', 'PARTIALLY_PAID', 'OVERDUE']);
const METHODS = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CARD'];

export function RecordPaymentDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [invoiceId, setInvoiceId] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [method, setMethod] = React.useState('BANK_TRANSFER');
  const [referenceNo, setReferenceNo] = React.useState('');
  const queryClient = useQueryClient();

  const { data: invoices } = useQuery({
    queryKey: ['invoices-picker'],
    queryFn: () => api.get<PaginatedResult<InvoiceOption>>('/invoices?page=1&pageSize=100'),
    enabled: open,
  });
  const outstanding = invoices?.items.filter((i) => OUTSTANDING.has(i.status)) ?? [];

  const mutation = useMutation({
    mutationFn: () => api.post('/payments', { invoiceId, amount: Number(amount), method, referenceNo: referenceNo || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-payments'] });
      setInvoiceId('');
      setAmount('');
      setReferenceNo('');
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>Record a payment against an outstanding invoice (FR-PAY-01).</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-1">
            <Label>Invoice</Label>
            <Select value={invoiceId} onValueChange={setInvoiceId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select an outstanding invoice" />
              </SelectTrigger>
              <SelectContent>
                {outstanding.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.invoiceNo} — balance {Number(inv.balance).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pay-amount">Amount</Label>
            <Input id="pay-amount" type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m.replaceAll('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pay-ref">Reference # (optional)</Label>
            <Input id="pay-ref" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
          </div>
          {mutation.isError && (
            <p className="text-sm text-destructive">{mutation.error instanceof ApiError ? mutation.error.message : 'Something went wrong'}</p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || !invoiceId || !amount}>
              {mutation.isPending ? 'Recording…' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

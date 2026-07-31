'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Mail, Printer } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { downloadFile, openFileInNewTab } from '@/lib/download';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Quotation, QuotationStatus } from '@/types';

const STATUS_LABEL: Record<QuotationStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  REVISED: 'Revised',
  CANCELLED: 'Cancelled',
};

const STATUS_VARIANT: Record<QuotationStatus, 'secondary' | 'default' | 'success' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  SENT: 'default',
  APPROVED: 'success',
  REJECTED: 'destructive',
  EXPIRED: 'outline',
  REVISED: 'outline',
  CANCELLED: 'destructive',
};

const CATEGORY_LABEL: Record<string, string> = { MATERIAL: 'Material', LABOR: 'Labor', TRANSPORTATION: 'Transportation' };

const currency = (n: number | string) => Number(n).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? '—'}</p>
    </div>
  );
}

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isCustomer = user?.role === 'CUSTOMER';
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmAction, setConfirmAction] = React.useState<'send' | 'cancel' | 'reject' | null>(null);
  const [rejectComment, setRejectComment] = React.useState('');

  const { data: quotation, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => api.get<Quotation>(`/quotations/${id}`),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['quotation', id] });
    queryClient.invalidateQueries({ queryKey: ['quotations'] });
    queryClient.invalidateQueries({ queryKey: ['quotation-statistics'] });
  };

  const statusMutation = useMutation({
    mutationFn: (status: QuotationStatus) => api.patch(`/quotations/${id}/status`, { status }),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Status updated' });
      setConfirmAction(null);
    },
    onError: (error) => {
      toast({ title: 'Could not update status', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
      setConfirmAction(null);
    },
  });

  const respondMutation = useMutation({
    mutationFn: (input: { decision: 'APPROVED' | 'REJECTED'; comments?: string }) => api.post(`/quotations/${id}/respond`, input),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Response recorded' });
      setConfirmAction(null);
      setRejectComment('');
    },
    onError: (error) => {
      toast({ title: 'Could not submit your response', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
      setConfirmAction(null);
    },
  });

  const emailMutation = useMutation({
    mutationFn: () => api.post(`/quotations/${id}/email`),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Quotation emailed to the customer' });
    },
    onError: (error) => {
      toast({ title: 'Could not send email', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
    },
  });

  async function handleDownload() {
    if (!quotation) return;
    try {
      const path = isCustomer ? `/quotations/me/${id}/pdf` : `/quotations/${id}/pdf`;
      await downloadFile(path, `${quotation.quotationNo}.pdf`);
    } catch (error) {
      toast({ title: 'Download failed', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
    }
  }

  async function handlePrint() {
    try {
      const path = isCustomer ? `/quotations/me/${id}/pdf` : `/quotations/${id}/pdf`;
      await openFileInNewTab(path);
    } catch (error) {
      toast({ title: 'Could not open PDF', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
    }
  }

  if (isLoading || !quotation) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const timeline = [
    ...(quotation.auditLogs ?? []).map((a) => ({ at: a.createdAt, label: a.action, note: a.note })),
    ...(quotation.approvals ?? []).map((a) => ({ at: a.createdAt, label: `CUSTOMER ${a.action}`, note: a.comments })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{quotation.quotationNo}</h1>
            <Badge variant={STATUS_VARIANT[quotation.status]}>{STATUS_LABEL[quotation.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{quotation.title || quotation.serviceRequest?.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="mr-1 h-4 w-4" /> Download
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
          {!isCustomer && quotation.status === 'DRAFT' && (
            <Button size="sm" onClick={() => setConfirmAction('send')}>
              Send to Customer
            </Button>
          )}
          {!isCustomer && quotation.status === 'SENT' && (
            <Button variant="outline" size="sm" onClick={() => emailMutation.mutate()} disabled={emailMutation.isPending}>
              <Mail className="mr-1 h-4 w-4" /> {emailMutation.isPending ? 'Sending…' : 'Email PDF'}
            </Button>
          )}
          {!isCustomer && (quotation.status === 'DRAFT' || quotation.status === 'SENT') && (
            <Button variant="destructive" size="sm" onClick={() => setConfirmAction('cancel')}>
              Cancel
            </Button>
          )}
          {isCustomer && quotation.status === 'SENT' && (
            <>
              <Button size="sm" onClick={() => respondMutation.mutate({ decision: 'APPROVED' })} disabled={respondMutation.isPending}>
                Approve
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setConfirmAction('reject')}>
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer &amp; Project Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {!isCustomer && <Field label="Customer" value={quotation.customer?.fullName} />}
          {!isCustomer && <Field label="Phone" value={quotation.customer?.phone} />}
          <Field label="Service" value={quotation.serviceRequest?.service?.serviceName ?? quotation.serviceRequest?.serviceCategory?.name} />
          <Field label="Project Location" value={quotation.serviceRequest?.projectLocation} />
          <Field label="Version" value={quotation.version} />
          <Field label="Valid Until" value={quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : undefined} />
          <Field label="Created" value={new Date(quotation.createdAt).toLocaleDateString()} />
          {quotation.emailSentAt && <Field label="Emailed" value={`${new Date(quotation.emailSentAt).toLocaleString()} (${quotation.emailStatus})`} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotation.lineItems?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.itemName || item.description}</TableCell>
                  <TableCell>{CATEGORY_LABEL[item.category] ?? item.category}</TableCell>
                  <TableCell>
                    {item.quantity} {item.unit}
                  </TableCell>
                  <TableCell>{currency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right">{currency(item.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Material Cost</span>
              <span>{currency(quotation.materialCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Labor Cost</span>
              <span>{currency(quotation.laborCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transportation Cost</span>
              <span>{currency(quotation.transportationCost)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 font-medium">
              <span>Subtotal</span>
              <span>{currency(quotation.subtotal)}</span>
            </div>
            {Number(quotation.discountAmount) > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Discount {quotation.discountType === 'PERCENTAGE' ? `(${quotation.discountValue}%)` : ''}</span>
                <span>-{currency(quotation.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT ({quotation.taxRatePercent}%)</span>
              <span>{currency(quotation.taxAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 text-base font-semibold">
              <span>Grand Total</span>
              <span>{currency(quotation.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {quotation.termsAndConditions && (
        <Card>
          <CardHeader>
            <CardTitle>Terms &amp; Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{quotation.termsAndConditions}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Approval Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
          <ul className="space-y-2">
            {timeline.map((event, i) => (
              <li key={i} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0">
                <div>
                  <span className="font-medium">{event.label.replaceAll('_', ' ')}</span>
                  {event.note && <span className="ml-2 text-muted-foreground">— {event.note}</span>}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(event.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <AlertDialog open={confirmAction === 'send'} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this Quotation to the customer?</AlertDialogTitle>
            <AlertDialogDescription>The customer will be notified and can approve or reject it.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => statusMutation.mutate('SENT')}>Send</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAction === 'cancel'} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this Quotation?</AlertDialogTitle>
            <AlertDialogDescription>This withdraws the quotation. It cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction onClick={() => statusMutation.mutate('CANCELLED')}>Cancel Quotation</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAction === 'reject'} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this Quotation?</AlertDialogTitle>
            <AlertDialogDescription>Let us know why (optional) — this helps us revise it.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1">
            <Label htmlFor="reject-comment">Comments</Label>
            <Textarea id="reject-comment" rows={3} value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction onClick={() => respondMutation.mutate({ decision: 'REJECTED', comments: rejectComment || undefined })}>
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

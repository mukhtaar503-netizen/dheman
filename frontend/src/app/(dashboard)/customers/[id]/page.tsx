'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, RotateCcw, Trash2, UserX } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { CustomerOverviewTab } from '@/components/customers/customer-overview-tab';
import { CustomerAddressesTab } from '@/components/customers/customer-addresses-tab';
import { CustomerContactsTab } from '@/components/customers/customer-contacts-tab';
import { CustomerNotesTab } from '@/components/customers/customer-notes-tab';
import { CustomerDocumentsTab } from '@/components/customers/customer-documents-tab';
import { CustomerProjectsTab } from '@/components/customers/customer-projects-tab';
import { CustomerPaymentsTab } from '@/components/customers/customer-payments-tab';
import { CustomerTimelineTab } from '@/components/customers/customer-timeline-tab';
import type { CustomerDetail } from '@/types';

const STATUS_VARIANT: Record<string, 'success' | 'secondary' | 'destructive'> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  BLOCKED: 'destructive',
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get<CustomerDetail>(`/customers/${id}`),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['customer', id] });
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    queryClient.invalidateQueries({ queryKey: ['customer-statistics'] });
  };

  const deactivateMutation = useMutation({
    mutationFn: () => api.post(`/customers/${id}/deactivate`),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Customer deactivated' });
    },
    onError: (e) => toast({ title: 'Could not deactivate', description: e instanceof ApiError ? e.message : undefined, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.del(`/customers/${id}`),
    onSuccess: () => {
      invalidate();
      setConfirmDelete(false);
      toast({ title: 'Customer deleted', description: 'This record can be restored from the customer list.' });
      router.push('/customers');
    },
    onError: (e) => toast({ title: 'Could not delete', description: e instanceof ApiError ? e.message : undefined, variant: 'destructive' }),
  });

  const restoreMutation = useMutation({
    mutationFn: () => api.post(`/customers/${id}/restore`),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Customer restored' });
    },
  });

  if (isLoading || !customer) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{customer.fullName}</h1>
            <Badge variant={STATUS_VARIANT[customer.status] ?? 'secondary'}>{customer.status}</Badge>
            {customer.deletedAt && <Badge variant="destructive">Deleted</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {customer.customerCode} · {customer.companyName ?? (customer.type === 'CORPORATE' ? 'Business' : 'Individual')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/customers/${id}/edit`}>
              <Pencil className="mr-1 h-4 w-4" /> Edit
            </Link>
          </Button>
          {customer.deletedAt ? (
            <Button variant="outline" size="sm" onClick={() => restoreMutation.mutate()}>
              <RotateCcw className="mr-1 h-4 w-4" /> Restore
            </Button>
          ) : (
            <>
              {customer.status === 'ACTIVE' && (
                <Button variant="outline" size="sm" onClick={() => deactivateMutation.mutate()}>
                  <UserX className="mr-1 h-4 w-4" /> Deactivate
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="addresses">Addresses ({customer.siteAddresses?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({customer.contacts.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({customer.notes.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({customer.documents.length})</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="payments">Invoices & Payments</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <CustomerOverviewTab customer={customer} />
        </TabsContent>
        <TabsContent value="addresses">
          <CustomerAddressesTab customerId={id} addresses={customer.siteAddresses ?? []} />
        </TabsContent>
        <TabsContent value="contacts">
          <CustomerContactsTab customerId={id} contacts={customer.contacts} />
        </TabsContent>
        <TabsContent value="notes">
          <CustomerNotesTab customerId={id} notes={customer.notes} />
        </TabsContent>
        <TabsContent value="documents">
          <CustomerDocumentsTab customerId={id} documents={customer.documents} />
        </TabsContent>
        <TabsContent value="projects">
          <CustomerProjectsTab current={customer.projectsCurrent} completed={customer.projectsCompleted} cancelled={customer.projectsCancelled} />
        </TabsContent>
        <TabsContent value="payments">
          <CustomerPaymentsTab customer={customer} />
        </TabsContent>
        <TabsContent value="timeline">
          <CustomerTimelineTab events={customer.timeline} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {customer.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This is a soft delete — the record and its history can be restored later. Linked projects, quotations, and invoices are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

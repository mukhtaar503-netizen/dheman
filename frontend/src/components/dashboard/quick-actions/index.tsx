'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { UserPlus, FolderPlus, ClipboardPlus, FileText, Receipt, Wrench, Wallet, ReceiptText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// These modal forms are opened rarely from the dashboard — dynamic-importing them keeps their
// code (and react-hook-form usage) out of the main dashboard bundle until actually clicked.
// Each `loading` fallback renders the exact same trigger button the real component would (with
// its icon/label baked in, since next/dynamic's loading component doesn't receive the wrapped
// component's props) so the button never flickers/disappears while its chunk loads.
const CreateCustomerDialog = dynamic(() => import('./create-customer-dialog').then((m) => m.CreateCustomerDialog), {
  ssr: false,
  loading: () => <ActionButton icon={UserPlus} label="Create Customer" />,
});
const CreateServiceRequestDialog = dynamic(() => import('./create-service-request-dialog').then((m) => m.CreateServiceRequestDialog), {
  ssr: false,
  loading: () => <ActionButton icon={ClipboardPlus} label="Create Service Request" />,
});
const RecordPaymentDialog = dynamic(() => import('./record-payment-dialog').then((m) => m.RecordPaymentDialog), {
  ssr: false,
  loading: () => <ActionButton icon={Wallet} label="Record Payment" />,
});
const AddExpenseDialog = dynamic(() => import('./add-expense-dialog').then((m) => m.AddExpenseDialog), {
  ssr: false,
  loading: () => <ActionButton icon={ReceiptText} label="Add Expense" />,
});

const actionButtonClasses = cn(
  'flex h-auto flex-col items-center gap-2 rounded-md border border-border py-4 text-xs transition-colors hover:bg-muted',
);

function ActionButton({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Button variant="outline" className="h-auto w-full flex-col gap-2 py-4">
      <Icon className="h-5 w-5" />
      <span className="text-xs font-normal">{label}</span>
    </Button>
  );
}

function ActionLink({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link href={href} className={actionButtonClasses}>
      <Icon className="h-5 w-5" />
      <span className="font-normal">{label}</span>
    </Link>
  );
}

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CreateCustomerDialog trigger={<ActionButton icon={UserPlus} label="Create Customer" />} />
        <CreateServiceRequestDialog trigger={<ActionButton icon={ClipboardPlus} label="Create Service Request" />} />
        <RecordPaymentDialog trigger={<ActionButton icon={Wallet} label="Record Payment" />} />
        <AddExpenseDialog trigger={<ActionButton icon={ReceiptText} label="Add Expense" />} />

        {/* These require selecting a parent record first (an Approved Quotation, a Project, etc.)
            so the quick action shortcuts to the module where that selection naturally happens. */}
        <ActionLink href="/quotations" icon={FolderPlus} label="Create Project" />
        <ActionLink href="/service-requests" icon={FileText} label="Create Quotation" />
        <ActionLink href="/projects" icon={Receipt} label="Create Invoice" />
        <ActionLink href="/technicians" icon={Wrench} label="Assign Technician" />
      </CardContent>
    </Card>
  );
}

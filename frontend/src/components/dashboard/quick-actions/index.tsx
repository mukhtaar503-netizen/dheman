'use client';

import Link from 'next/link';
import { UserPlus, FolderPlus, ClipboardPlus, FileText, Receipt, Wrench, Wallet, ReceiptText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CreateCustomerDialog } from './create-customer-dialog';
import { CreateServiceRequestDialog } from './create-service-request-dialog';
import { RecordPaymentDialog } from './record-payment-dialog';
import { AddExpenseDialog } from './add-expense-dialog';

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

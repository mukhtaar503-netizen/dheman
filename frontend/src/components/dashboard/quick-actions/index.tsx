'use client';

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { UserPlus, ClipboardPlus, ClipboardCheck, FileText, Wallet } from 'lucide-react';
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
  loading: () => <ActionButton icon={UserPlus} label="New Customer" />,
});
const CreateServiceRequestDialog = dynamic(() => import('./create-service-request-dialog').then((m) => m.CreateServiceRequestDialog), {
  ssr: false,
  loading: () => <ActionButton icon={ClipboardPlus} label="New Service Request" />,
});
const RecordPaymentDialog = dynamic(() => import('./record-payment-dialog').then((m) => m.RecordPaymentDialog), {
  ssr: false,
  loading: () => <ActionButton icon={Wallet} label="Record Payment" />,
});

const actionButtonClasses = cn(
  'flex h-auto flex-col items-center gap-2 rounded-md border border-border py-4 text-xs transition-colors hover:bg-muted',
);

// forwardRef + prop-spreading is required here: Radix's `DialogTrigger asChild` clones this
// element to inject onClick/ref/aria-* (so clicking it opens the dialog) — a wrapper that drops
// those props silently breaks the trigger without throwing, since Button itself never receives them.
const ActionButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: React.ComponentType<{ className?: string }>; label: string }
>(({ icon: Icon, label, ...props }, ref) => {
  return (
    <Button variant="outline" className="h-auto w-full flex-col gap-2 py-4" ref={ref} {...props}>
      <Icon className="h-5 w-5" />
      <span className="text-xs font-normal">{label}</span>
    </Button>
  );
});
ActionButton.displayName = 'ActionButton';

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
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <CreateCustomerDialog trigger={<ActionButton icon={UserPlus} label="New Customer" />} />
        <CreateServiceRequestDialog trigger={<ActionButton icon={ClipboardPlus} label="New Service Request" />} />
        <ActionLink href="/site-inspections/new" icon={ClipboardCheck} label="New Site Inspection" />
        <ActionLink href="/quotations/new" icon={FileText} label="New Quotation" />
        <RecordPaymentDialog trigger={<ActionButton icon={Wallet} label="Record Payment" />} />
      </CardContent>
    </Card>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { UserPlus, ClipboardPlus, ClipboardCheck, FileText, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

// These modal forms are opened rarely from the dashboard — dynamic-importing them keeps their
// code (and react-hook-form usage) out of the main dashboard bundle until actually clicked.
// Each `loading` fallback renders the exact same trigger pill the real component would (since
// next/dynamic's loading component doesn't receive the wrapped component's props) so it never
// flickers/disappears while its chunk loads.
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

const pillBase =
  'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
const defaultPill = cn(pillBase, 'border-border bg-card hover:bg-muted');
// New Site Inspection and New Quotation are the primary next steps in the delivery workflow,
// so they get the filled/primary treatment to stand out among the other actions.
const prominentPill = cn(pillBase, 'border-transparent bg-primary text-primary-foreground hover:opacity-90');

type ActionVisuals = { icon: React.ComponentType<{ className?: string }>; label: string; prominent?: boolean };

// forwardRef + prop-spreading is required here: Radix's `DialogTrigger asChild` clones this
// element to inject onClick/ref/aria-* (so clicking it opens the dialog) — a wrapper that drops
// those props silently breaks the trigger without throwing, since the button never receives them.
const ActionButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & ActionVisuals>(
  ({ icon: Icon, label, prominent, className, ...props }, ref) => (
    <button ref={ref} type="button" className={cn(prominent ? prominentPill : defaultPill, className)} {...props}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  ),
);
ActionButton.displayName = 'ActionButton';

function ActionLink({ href, icon: Icon, label, prominent }: ActionVisuals & { href: string }) {
  return (
    <Link href={href} className={prominent ? prominentPill : defaultPill}>
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

export function QuickActions() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">Quick Actions</h2>
      <div className="flex flex-wrap gap-2">
        <CreateCustomerDialog trigger={<ActionButton icon={UserPlus} label="New Customer" />} />
        <CreateServiceRequestDialog trigger={<ActionButton icon={ClipboardPlus} label="New Service Request" />} />
        <ActionLink href="/site-inspections/new" icon={ClipboardCheck} label="New Site Inspection" prominent />
        <ActionLink href="/quotations/new" icon={FileText} label="New Quotation" prominent />
        <RecordPaymentDialog trigger={<ActionButton icon={Wallet} label="Record Payment" />} />
      </div>
    </div>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { UserPlus, ClipboardPlus, ClipboardCheck, FileText, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// These modal forms are opened rarely from the dashboard — dynamic-importing them keeps their
// code (and react-hook-form usage) out of the main dashboard bundle until actually clicked.
// Each `loading` fallback renders the exact same trigger card the real component would (with
// its icon/label/description baked in, since next/dynamic's loading component doesn't receive
// the wrapped component's props) so the card never flickers/disappears while its chunk loads.
const CreateCustomerDialog = dynamic(() => import('./create-customer-dialog').then((m) => m.CreateCustomerDialog), {
  ssr: false,
  loading: () => <ActionButton icon={UserPlus} label="New Customer" description="Add a new customer record" />,
});
const CreateServiceRequestDialog = dynamic(() => import('./create-service-request-dialog').then((m) => m.CreateServiceRequestDialog), {
  ssr: false,
  loading: () => <ActionButton icon={ClipboardPlus} label="New Service Request" description="Log a new service request" />,
});
const RecordPaymentDialog = dynamic(() => import('./record-payment-dialog').then((m) => m.RecordPaymentDialog), {
  ssr: false,
  loading: () => <ActionButton icon={Wallet} label="Record Payment" description="Log a received payment" />,
});

const cardBase =
  'flex h-full flex-col items-start gap-2 rounded-xl border p-4 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
const defaultCard = cn(cardBase, 'border-border bg-card hover:bg-muted/60');
// New Site Inspection and New Quotation are the primary next steps in the delivery workflow,
// so they get the filled/primary treatment to stand out from the other three actions.
const prominentCard = cn(cardBase, 'border-transparent bg-primary text-primary-foreground hover:opacity-90');

function ActionIcon({ icon: Icon, prominent }: { icon: React.ComponentType<{ className?: string }>; prominent?: boolean }) {
  return (
    <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', prominent ? 'bg-primary-foreground/15' : 'bg-muted')}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

type ActionVisuals = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  prominent?: boolean;
};

// forwardRef + prop-spreading is required here: Radix's `DialogTrigger asChild` clones this
// element to inject onClick/ref/aria-* (so clicking it opens the dialog) — a wrapper that drops
// those props silently breaks the trigger without throwing, since the button never receives them.
const ActionButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & ActionVisuals>(
  ({ icon, label, description, prominent, className, ...props }, ref) => (
    <button ref={ref} type="button" className={cn(prominent ? prominentCard : defaultCard, className)} {...props}>
      <ActionIcon icon={icon} prominent={prominent} />
      <span className="font-medium">{label}</span>
      <span className={cn('text-xs leading-snug', prominent ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{description}</span>
    </button>
  ),
);
ActionButton.displayName = 'ActionButton';

function ActionLink({ href, icon, label, description, prominent }: ActionVisuals & { href: string }) {
  return (
    <Link href={href} className={prominent ? prominentCard : defaultCard}>
      <ActionIcon icon={icon} prominent={prominent} />
      <span className="font-medium">{label}</span>
      <span className={cn('text-xs leading-snug', prominent ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{description}</span>
    </Link>
  );
}

export function QuickActions() {
  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <CreateCustomerDialog trigger={<ActionButton icon={UserPlus} label="New Customer" description="Add a new customer record" />} />
        <CreateServiceRequestDialog
          trigger={<ActionButton icon={ClipboardPlus} label="New Service Request" description="Log a new service request" />}
        />
        <ActionLink href="/site-inspections/new" icon={ClipboardCheck} label="New Site Inspection" description="Schedule a site visit" prominent />
        <ActionLink href="/quotations/new" icon={FileText} label="New Quotation" description="Create and send a quotation" prominent />
        <RecordPaymentDialog trigger={<ActionButton icon={Wallet} label="Record Payment" description="Log a received payment" />} />
      </CardContent>
    </Card>
  );
}

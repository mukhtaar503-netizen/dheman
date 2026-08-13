'use client';

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { UserPlus, ClipboardPlus, ClipboardCheck, FileText, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';
import { surfaceClass, surfaceStyle } from '../surface';

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

// The panel itself sits on BRAND.navy (see surface.ts) — one step lighter than the page's
// BRAND.navyDark background — so buttons need a further lightening step to stay visible against
// it, rather than reusing BRAND.navy again. Secondary buttons use a plain white overlay (the
// same technique the sidebar already uses for its hover/active states); primary buttons use the
// brand accent. Hover states stay within that same layering instead of inventing new colors.
const pillBase =
  'inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border px-4 text-sm font-medium transition-all duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 sm:w-auto sm:justify-start';

const secondaryPill = cn(
  pillBase,
  'border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10 focus-visible:ring-white/40',
);

// New Site Inspection and New Quotation are the primary next steps in the delivery workflow,
// so they get the brand accent fill to stand out — dark navy text/icon for contrast against
// the lighter orange, per the same hierarchy the rest of the buttons already use.
const primaryPill = cn(pillBase, 'border-transparent bg-[var(--qa-bg)] text-[var(--qa-fg)] hover:opacity-90 focus-visible:ring-white/60');
const primaryStyle = { '--qa-bg': BRAND.orange, '--qa-fg': BRAND.navyDark } as React.CSSProperties;

type ActionVisuals = { icon: React.ComponentType<{ className?: string }>; label: string; prominent?: boolean };

// forwardRef + prop-spreading is required here: Radix's `DialogTrigger asChild` clones this
// element to inject onClick/ref/aria-* (so clicking it opens the dialog) — a wrapper that drops
// those props silently breaks the trigger without throwing, since the button never receives them.
const ActionButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & ActionVisuals>(
  ({ icon: Icon, label, prominent, className, style, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(prominent ? primaryPill : secondaryPill, className)}
      style={{ ...(prominent ? primaryStyle : undefined), ...style }}
      {...props}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {label}
    </button>
  ),
);
ActionButton.displayName = 'ActionButton';

function ActionLink({ href, icon: Icon, label, prominent }: ActionVisuals & { href: string }) {
  return (
    <Link href={href} className={prominent ? primaryPill : secondaryPill} style={prominent ? primaryStyle : undefined}>
      <Icon className="h-5 w-5 shrink-0" />
      {label}
    </Link>
  );
}

export function QuickActions() {
  return (
    <div className={cn(surfaceClass, 'p-5')} style={surfaceStyle}>
      <h2 className="mb-4 text-[18px] font-semibold text-white">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
        <CreateCustomerDialog trigger={<ActionButton icon={UserPlus} label="New Customer" />} />
        <CreateServiceRequestDialog trigger={<ActionButton icon={ClipboardPlus} label="New Service Request" />} />
        <ActionLink href="/site-inspections/new" icon={ClipboardCheck} label="New Site Inspection" prominent />
        <ActionLink href="/quotations/new" icon={FileText} label="New Quotation" prominent />
        <RecordPaymentDialog trigger={<ActionButton icon={Wallet} label="Record Payment" />} />
      </div>
    </div>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { UserPlus, ClipboardPlus, ClipboardCheck, FileText, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';

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

// Button colors are CSS custom properties fed from BRAND (src/lib/brand.ts) — the same fixed
// navy/orange palette the sidebar uses — so this bar reads as "the same design system" as the
// rest of the shell instead of introducing its own colors. Hover states reuse BRAND.navyLight
// (secondary) or a plain opacity dip (primary) rather than inventing new shades.
const pillBase =
  'inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border px-4 text-sm font-medium transition-all duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 sm:w-auto sm:justify-start';

const secondaryPill = cn(
  pillBase,
  'border-[var(--qa-border)] bg-[var(--qa-bg)] text-white hover:bg-[var(--qa-bg-hover)] hover:border-[var(--qa-border-hover)] focus-visible:ring-white/40',
);
const secondaryStyle = {
  '--qa-bg': BRAND.navy,
  '--qa-bg-hover': BRAND.navyLight,
  '--qa-border': `${BRAND.orange}2E`,
  '--qa-border-hover': `${BRAND.orange}4D`,
} as React.CSSProperties;

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
      style={{ ...(prominent ? primaryStyle : secondaryStyle), ...style }}
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
    <Link href={href} className={prominent ? primaryPill : secondaryPill} style={prominent ? primaryStyle : secondaryStyle}>
      <Icon className="h-5 w-5 shrink-0" />
      {label}
    </Link>
  );
}

export function QuickActions() {
  return (
    <div className="rounded-2xl border p-5" style={{ backgroundColor: BRAND.navyDark, borderColor: `${BRAND.orange}26` }}>
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

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Users, Briefcase, ClipboardList, FileText, CreditCard, DollarSign } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { dashboardApi } from '@/lib/dashboard-api';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { ErrorBoundary } from '@/components/error-boundary';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DashboardSummary, DateRangePreset } from '@/types';

const RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];

// Only the revenue figure actually changes with the date filter (it's the only period-scoped
// number the backend computes) — the label reflects that so it's clear why picking "Today"
// doesn't move any of the other cards.
const REVENUE_LABEL: Record<DateRangePreset, string> = {
  today: "Today's Revenue",
  month: 'Monthly Revenue',
  year: "This Year's Revenue",
} as Record<DateRangePreset, string>;

function currency(n: number) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function PeriodSelector({ value, onChange }: { value: DateRangePreset; onChange: (v: DateRangePreset) => void }) {
  return (
    <div role="tablist" aria-label="Date range" className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5">
      {RANGE_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function StatCard({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-semibold leading-none tracking-tight">{value}</p>
        <p className="mt-1.5 truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </Link>
  );
}

/** Compact recap of counts already present in the fetched summary — no extra request. The
 *  "No financial data yet" note covers only the missing revenue trend, not the whole panel,
 *  since the counts below are real values (including legitimate zeros), not missing data. */
function BusinessOverview({ data }: { data: DashboardSummary }) {
  const rows = [
    { label: 'Active Projects', value: data.activeProjects ?? 0 },
    { label: 'Pending Requests', value: data.pendingRequests ?? 0 },
    { label: 'Pending Quotations', value: data.pendingQuotations ?? 0 },
    { label: 'Pending Payments', value: data.pendingPayments ?? 0 },
  ];
  const hasRevenue = (data.monthlyRevenue ?? 0) > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-2 text-sm font-semibold">Business Overview</h2>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between py-2 text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium tabular-nums">{row.value}</span>
          </li>
        ))}
      </ul>
      {!hasRevenue && <p className="pt-2 text-center text-xs text-muted-foreground">No financial data yet</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [range, setRange] = React.useState<DateRangePreset>('month');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary', range],
    queryFn: () => dashboardApi.summary({ range }),
    enabled: !!user,
  });

  const isTechnician = user?.role === 'TECHNICIAN';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{user ? `${greeting()}, ${user.fullName.split(' ')[0]}` : 'Dashboard'}</h1>
          <p className="text-xs text-muted-foreground">Here&apos;s your business overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">{todayLabel()}</p>
          {!isTechnician && <PeriodSelector value={range} onChange={setRange} />}
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && data && isTechnician && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {data.cards?.map((card) => (
            <div key={card.key} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xl font-semibold leading-none tracking-tight">{card.value}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {!isLoading && data && !isTechnician && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard href="/customers" icon={Users} label="Customers" value={data.customers ?? 0} />
          <StatCard href="/projects" icon={Briefcase} label="Active Projects" value={data.activeProjects ?? 0} />
          <StatCard href="/service-requests" icon={ClipboardList} label="Pending Requests" value={data.pendingRequests ?? 0} />
          <StatCard href="/quotations" icon={FileText} label="Pending Quotations" value={data.pendingQuotations ?? 0} />
          <StatCard href="/invoices" icon={CreditCard} label="Pending Payments" value={data.pendingPayments ?? 0} />
          <StatCard href="/invoices" icon={DollarSign} label={REVENUE_LABEL[range]} value={currency(data.monthlyRevenue ?? 0)} />
        </div>
      )}

      {!isTechnician && (
        <ErrorBoundary fallbackTitle="Couldn't load quick actions">
          <QuickActions />
        </ErrorBoundary>
      )}

      {!isLoading && data && !isTechnician && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {data.recentActivity && (
            <ErrorBoundary fallbackTitle="Couldn't load recent activity">
              <RecentActivity items={data.recentActivity} />
            </ErrorBoundary>
          )}
          <BusinessOverview data={data} />
        </div>
      )}
    </div>
  );
}

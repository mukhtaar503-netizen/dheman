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
import { BRAND } from '@/lib/brand';
import { surfaceClass, surfaceStyle } from '@/components/dashboard/surface';
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
    <div role="tablist" aria-label="Date range" className="inline-flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5">
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
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40',
              !active && 'text-white/60 hover:text-white',
            )}
            style={active ? { backgroundColor: BRAND.orange, color: BRAND.navyDark } : undefined}
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
      className={cn(surfaceClass, 'flex items-center gap-3 p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--stat-hover-border)]')}
      style={{ ...surfaceStyle, '--stat-hover-border': `${BRAND.orange}66` } as React.CSSProperties}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${BRAND.orange}22`, color: BRAND.orange }}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[26px] font-bold leading-none tracking-tight text-white">{value}</p>
        <p className="mt-1.5 truncate text-[13px] text-white/60">{label}</p>
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
    <div className={cn(surfaceClass, 'p-5')} style={surfaceStyle}>
      <h2 className="mb-2 text-[18px] font-semibold text-white">Business Overview</h2>
      <ul className="divide-y divide-white/10">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between py-2 text-sm">
            <span className="text-white/60">{row.label}</span>
            <span className="font-medium tabular-nums text-white">{row.value}</span>
          </li>
        ))}
      </ul>
      {!hasRevenue && <p className="pt-2 text-center text-xs text-white/50">No financial data yet</p>}
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
    <div className="-m-4 min-h-[calc(100vh-4rem)] p-4 sm:-m-6 sm:p-6 lg:p-8" style={{ backgroundColor: BRAND.navyDark }}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{user ? `${greeting()}, ${user.fullName.split(' ')[0]}` : 'Dashboard'}</h1>
            <p className="text-[13px] text-white/60">Here&apos;s your business overview.</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[13px] text-white/60">{todayLabel()}</p>
            {!isTechnician && <PeriodSelector value={range} onChange={setRange} />}
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[76px] w-full rounded-2xl bg-white/5" />
            ))}
          </div>
        )}

        {!isLoading && data && isTechnician && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {data.cards?.map((card) => (
              <div key={card.key} className={cn(surfaceClass, 'p-4')} style={surfaceStyle}>
                <p className="text-[26px] font-bold leading-none tracking-tight text-white">{card.value}</p>
                <p className="mt-1.5 text-[13px] text-white/60">{card.label}</p>
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
    </div>
  );
}

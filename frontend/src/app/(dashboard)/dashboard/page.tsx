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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function PeriodSelector({ value, onChange }: { value: DateRangePreset; onChange: (v: DateRangePreset) => void }) {
  return (
    <div role="tablist" aria-label="Date range" className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-1">
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
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
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
  description,
  emptyText,
  isEmpty,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  description: string;
  emptyText: string;
  isEmpty: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{isEmpty ? emptyText : description}</p>
      </div>
    </Link>
  );
}

/** Lightweight, chart-free summary derived entirely from the already-fetched dashboard summary —
 *  no extra requests. Falls back to a plain empty state once there's nothing to show yet. */
function BusinessOverview({ data, range }: { data: DashboardSummary; range: DateRangePreset }) {
  const revenue = data.monthlyRevenue ?? 0;
  const activeProjects = data.activeProjects ?? 0;
  const pendingQuotations = data.pendingQuotations ?? 0;
  const hasData = revenue > 0 || activeProjects > 0 || pendingQuotations > 0;

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle>Business Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No financial data available yet.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">{REVENUE_LABEL[range]}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">{currency(revenue)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
              <div>
                <p className="text-xs text-muted-foreground">Active Projects</p>
                <p className="mt-0.5 text-lg font-medium">{activeProjects}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending Quotations</p>
                <p className="mt-0.5 text-lg font-medium">{pendingQuotations}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{user ? `${greeting()}, ${user.fullName.split(' ')[0]}` : 'Dashboard'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your business today.</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{todayLabel()}</p>
          {!isTechnician && <PeriodSelector value={range} onChange={setRange} />}
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[132px] w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && data && isTechnician && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {data.cards?.map((card) => (
            <div key={card.key} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {!isLoading && data && !isTechnician && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            href="/customers"
            icon={Users}
            label="Customers"
            value={data.customers ?? 0}
            description="Registered customers"
            emptyText="No customers yet"
            isEmpty={(data.customers ?? 0) === 0}
          />
          <StatCard
            href="/projects"
            icon={Briefcase}
            label="Active Projects"
            value={data.activeProjects ?? 0}
            description="Currently in progress"
            emptyText="No active projects"
            isEmpty={(data.activeProjects ?? 0) === 0}
          />
          <StatCard
            href="/service-requests"
            icon={ClipboardList}
            label="Pending Requests"
            value={data.pendingRequests ?? 0}
            description="Awaiting review"
            emptyText="No pending requests"
            isEmpty={(data.pendingRequests ?? 0) === 0}
          />
          <StatCard
            href="/quotations"
            icon={FileText}
            label="Pending Quotations"
            value={data.pendingQuotations ?? 0}
            description="Awaiting response"
            emptyText="No pending quotations"
            isEmpty={(data.pendingQuotations ?? 0) === 0}
          />
          <StatCard
            href="/invoices"
            icon={CreditCard}
            label="Pending Payments"
            value={data.pendingPayments ?? 0}
            description="Outstanding invoices"
            emptyText="No pending payments"
            isEmpty={(data.pendingPayments ?? 0) === 0}
          />
          <StatCard
            href="/invoices"
            icon={DollarSign}
            label={REVENUE_LABEL[range]}
            value={currency(data.monthlyRevenue ?? 0)}
            description="Total collected"
            emptyText="No revenue recorded yet"
            isEmpty={(data.monthlyRevenue ?? 0) === 0}
          />
        </div>
      )}

      {!isTechnician && (
        <ErrorBoundary fallbackTitle="Couldn't load quick actions">
          <QuickActions />
        </ErrorBoundary>
      )}

      {!isLoading && data && !isTechnician && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BusinessOverview data={data} range={range} />
          {data.recentActivity && (
            <ErrorBoundary fallbackTitle="Couldn't load recent activity">
              <RecentActivity items={data.recentActivity} />
            </ErrorBoundary>
          )}
        </div>
      )}
    </div>
  );
}

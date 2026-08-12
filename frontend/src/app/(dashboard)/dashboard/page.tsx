'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { dashboardApi } from '@/lib/dashboard-api';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { ErrorBoundary } from '@/components/error-boundary';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { DateRangePreset } from '@/types';

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

function StatCard({ href, label, value }: { href: string; label: string; value: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Link>
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          {user && <p className="text-sm text-muted-foreground">{greeting()}, {user.fullName.split(' ')[0]}</p>}
        </div>
        {!isTechnician && (
          <div className="flex gap-1">
            {RANGE_OPTIONS.map((opt) => (
              <Button key={opt.value} size="sm" variant={range === opt.value ? 'default' : 'outline'} onClick={() => setRange(opt.value)}>
                {opt.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[74px] w-full" />
          ))}
        </div>
      )}

      {!isLoading && data && isTechnician && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {data.cards?.map((card) => (
            <div key={card.key} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {!isLoading && data && !isTechnician && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard href="/customers" label="Customers" value={data.customers ?? 0} />
          <StatCard href="/projects" label="Active Projects" value={data.activeProjects ?? 0} />
          <StatCard href="/service-requests" label="Pending Requests" value={data.pendingRequests ?? 0} />
          <StatCard href="/quotations" label="Pending Quotations" value={data.pendingQuotations ?? 0} />
          <StatCard href="/invoices" label="Pending Payments" value={data.pendingPayments ?? 0} />
          <StatCard href="/invoices" label={REVENUE_LABEL[range]} value={currency(data.monthlyRevenue ?? 0)} />
        </div>
      )}

      {!isTechnician && (
        <ErrorBoundary fallbackTitle="Couldn't load quick actions">
          <QuickActions />
        </ErrorBoundary>
      )}

      {!isLoading && data?.recentActivity && (
        <ErrorBoundary fallbackTitle="Couldn't load recent activity">
          <RecentActivity items={data.recentActivity} />
        </ErrorBoundary>
      )}
    </div>
  );
}

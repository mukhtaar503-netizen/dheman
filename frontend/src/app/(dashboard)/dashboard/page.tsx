'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/use-auth';
import { GlobalFilterBar } from '@/components/dashboard/global-filter-bar';
import { StatTiles } from '@/components/dashboard/stat-tiles';
import { UpcomingPanel } from '@/components/dashboard/upcoming-panel';
import { CompanyOverviewCard } from '@/components/dashboard/company-overview-card';
import { HeroValueTile } from '@/components/dashboard/hero-value-tile';
import { PerformancePanel } from '@/components/dashboard/performance-panel';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { RecentCustomersTable } from '@/components/dashboard/recent-customers-table';
import { RecentPaymentsTable } from '@/components/dashboard/recent-payments-table';
import { ErrorBoundary } from '@/components/error-boundary';
import { Skeleton } from '@/components/ui/skeleton';

// recharts is a sizeable dependency — dynamic-importing these keeps it out of the dashboard's
// initial JS bundle, deferring it until the charts themselves are about to render.
const chartLoading = () => <Skeleton className="h-80 w-full" />;
const RevenueChart = dynamic(() => import('@/components/dashboard/charts/revenue-chart').then((m) => m.RevenueChart), {
  ssr: false,
  loading: chartLoading,
});
const ProjectsChart = dynamic(() => import('@/components/dashboard/charts/projects-chart').then((m) => m.ProjectsChart), {
  ssr: false,
  loading: chartLoading,
});
const ExpensesChart = dynamic(() => import('@/components/dashboard/charts/expenses-chart').then((m) => m.ExpensesChart), {
  ssr: false,
  loading: chartLoading,
});
const ServicesChart = dynamic(() => import('@/components/dashboard/charts/services-chart').then((m) => m.ServicesChart), {
  ssr: false,
  loading: chartLoading,
});

// Mirrors backend RBAC: /dashboard/revenue|expenses|activity|customers|payments are
// restricted to Super Admin / Admin / Project Manager / Accountant (see dashboard.routes.ts).
const FINANCE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT'];

export default function DashboardPage() {
  const { user } = useAuth();
  const canSeeFinance = user ? FINANCE_ROLES.includes(user.role) : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <GlobalFilterBar />
      </div>

      {/* Hero row: stat tiles + project status (2/3) alongside upcoming/overview/performance (1/3) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ErrorBoundary fallbackTitle="Couldn't load stat tiles">
            <StatTiles />
          </ErrorBoundary>
          <ErrorBoundary fallbackTitle="Couldn't load project status">
            <ProjectsChart />
          </ErrorBoundary>
        </div>
        <div className="space-y-4">
          <ErrorBoundary fallbackTitle="Couldn't load upcoming panel">
            <UpcomingPanel />
          </ErrorBoundary>
          <ErrorBoundary fallbackTitle="Couldn't load company overview">
            <CompanyOverviewCard />
          </ErrorBoundary>
          {canSeeFinance && (
            <ErrorBoundary fallbackTitle="Couldn't load revenue tile">
              <HeroValueTile />
            </ErrorBoundary>
          )}
          <ErrorBoundary fallbackTitle="Couldn't load performance panel">
            <PerformancePanel />
          </ErrorBoundary>
        </div>
      </div>

      {canSeeFinance && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <ErrorBoundary fallbackTitle="Couldn't load revenue chart">
              <RevenueChart />
            </ErrorBoundary>
            <ErrorBoundary fallbackTitle="Couldn't load expense chart">
              <ExpensesChart />
            </ErrorBoundary>
          </div>
          <ErrorBoundary fallbackTitle="Couldn't load service distribution">
            <ServicesChart />
          </ErrorBoundary>
        </>
      )}

      {!canSeeFinance && (
        <ErrorBoundary fallbackTitle="Couldn't load service distribution">
          <ServicesChart />
        </ErrorBoundary>
      )}

      {canSeeFinance && (
        <ErrorBoundary fallbackTitle="Couldn't load quick actions">
          <QuickActions />
        </ErrorBoundary>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ErrorBoundary fallbackTitle="Couldn't load recent activity">
          <RecentActivity />
        </ErrorBoundary>
        {canSeeFinance ? (
          <ErrorBoundary fallbackTitle="Couldn't load recent customers">
            <RecentCustomersTable />
          </ErrorBoundary>
        ) : null}
      </div>

      {canSeeFinance && (
        <ErrorBoundary fallbackTitle="Couldn't load recent payments">
          <RecentPaymentsTable />
        </ErrorBoundary>
      )}
    </div>
  );
}

'use client';

import { useAuth } from '@/hooks/use-auth';
import { GlobalFilterBar } from '@/components/dashboard/global-filter-bar';
import { KpiGrid } from '@/components/dashboard/kpi-grid';
import { RevenueChart } from '@/components/dashboard/charts/revenue-chart';
import { ProjectsChart } from '@/components/dashboard/charts/projects-chart';
import { ExpensesChart } from '@/components/dashboard/charts/expenses-chart';
import { ServicesChart } from '@/components/dashboard/charts/services-chart';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { RecentCustomersTable } from '@/components/dashboard/recent-customers-table';
import { RecentPaymentsTable } from '@/components/dashboard/recent-payments-table';
import { ErrorBoundary } from '@/components/error-boundary';

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

      <ErrorBoundary fallbackTitle="Couldn't load KPI cards">
        <KpiGrid />
      </ErrorBoundary>

      {canSeeFinance && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <ErrorBoundary fallbackTitle="Couldn't load revenue chart">
              <RevenueChart />
            </ErrorBoundary>
            <ErrorBoundary fallbackTitle="Couldn't load project chart">
              <ProjectsChart />
            </ErrorBoundary>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ErrorBoundary fallbackTitle="Couldn't load expense chart">
              <ExpensesChart />
            </ErrorBoundary>
            <ErrorBoundary fallbackTitle="Couldn't load service distribution">
              <ServicesChart />
            </ErrorBoundary>
          </div>
        </>
      )}

      {!canSeeFinance && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ErrorBoundary fallbackTitle="Couldn't load project chart">
            <ProjectsChart />
          </ErrorBoundary>
          <ErrorBoundary fallbackTitle="Couldn't load service distribution">
            <ServicesChart />
          </ErrorBoundary>
        </div>
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

import { ExpenseStatus, InvoiceStatus, ProjectStatus, QuotationStatus, Role, ServiceRequestStatus, TaskStatus, UserStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AuthUser } from '@/middleware/auth';
import { percentChange, resolveDateRange, DateRangePreset } from '@/utils/date-range';
import { getTechnicianProductivity } from '@/modules/technicians/technicians.service';
import { getCustomerSatisfactionReport } from '@/modules/reports/reports.service';

export interface RangeQuery {
  range: DateRangePreset;
  from?: Date;
  to?: Date;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

async function sumPayments(from: Date, to: Date) {
  const result = await prisma.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: from, lte: to }, reversedAt: null } });
  return Number(result._sum.amount ?? 0);
}

async function sumApprovedExpenses(from: Date, to: Date) {
  const result = await prisma.expense.aggregate({ _sum: { amount: true }, where: { status: ExpenseStatus.APPROVED, date: { gte: from, lte: to } } });
  return Number(result._sum.amount ?? 0);
}

/** KPI Cards + Performance Metrics for the dashboard overview (Section "Dashboard Overview" / "Performance Metrics"). */
export async function getSummary(user: AuthUser, query: RangeQuery) {
  const { from, to, previousFrom, previousTo } = resolveDateRange(query.range, query.from, query.to);

  if (user.role === Role.TECHNICIAN) {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
    const [todayTasks, activeTasks, completedTasks, productivity] = await Promise.all([
      prisma.task.count({ where: { assignments: { some: { technicianId: user.id } }, dueDate: { gte: todayStart, lte: todayEnd } } }),
      prisma.task.count({ where: { assignments: { some: { technicianId: user.id } }, status: { in: [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS] } } }),
      prisma.task.count({ where: { assignments: { some: { technicianId: user.id } }, status: TaskStatus.VERIFIED } }),
      getTechnicianProductivity(user.id),
    ]);
    return {
      role: user.role,
      cards: [
        { key: 'todayTasks', label: "Today's Tasks", value: todayTasks },
        { key: 'activeTasks', label: 'Active Tasks', value: activeTasks },
        { key: 'completedTasks', label: 'Completed Jobs', value: completedTasks },
      ],
      performance: { technicianOnTimeRatePercent: productivity.onTimeRate },
    };
  }

  const [
    totalCustomers, totalCustomersPrev,
    activeProjects, activeProjectsPrev,
    pendingServiceRequests,
    pendingQuotations,
    completedProjects, completedProjectsPrev,
    activeTechnicians,
    monthlyRevenue, monthlyRevenuePrev,
    pendingPaymentsAgg,
    monthlyExpenses,
    completionRateAgg,
    satisfaction,
    outstandingAgg,
  ] = await Promise.all([
    prisma.customer.count({ where: { status: 'ACTIVE', createdAt: { lte: to } } }),
    prisma.customer.count({ where: { status: 'ACTIVE', createdAt: { lte: previousTo } } }),
    prisma.project.count({ where: { status: { notIn: [ProjectStatus.CLOSED, ProjectStatus.CANCELLED] }, createdAt: { lte: to } } }),
    prisma.project.count({ where: { status: { notIn: [ProjectStatus.CLOSED, ProjectStatus.CANCELLED] }, createdAt: { lte: previousTo } } }),
    prisma.serviceRequest.count({ where: { status: { in: [ServiceRequestStatus.NEW, ServiceRequestStatus.UNDER_REVIEW, ServiceRequestStatus.SITE_INSPECTION_SCHEDULED] } } }),
    prisma.quotation.count({ where: { status: QuotationStatus.SENT } }),
    prisma.project.count({ where: { status: ProjectStatus.COMPLETED, actualEndDate: { gte: from, lte: to } } }),
    prisma.project.count({ where: { status: ProjectStatus.COMPLETED, actualEndDate: { gte: previousFrom, lte: previousTo } } }),
    prisma.technicianProfile.count({ where: { status: UserStatus.ACTIVE } }),
    sumPayments(from, to),
    sumPayments(previousFrom, previousTo),
    prisma.invoice.aggregate({ _sum: { balance: true }, _count: true, where: { status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] } } }),
    sumApprovedExpenses(from, to),
    prisma.project.groupBy({ by: ['status'], _count: true }),
    getCustomerSatisfactionReport(),
    prisma.invoice.aggregate({ _sum: { balance: true }, where: { status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] } } }),
  ]);

  const totalProjectsForRate = completionRateAgg.reduce((sum, g) => sum + g._count, 0);
  const closedOrCompleted = completionRateAgg
    .filter((g) => g.status === ProjectStatus.COMPLETED || g.status === ProjectStatus.CLOSED)
    .reduce((sum, g) => sum + g._count, 0);
  const completionRatePercent = totalProjectsForRate > 0 ? round2((closedOrCompleted / totalProjectsForRate) * 100) : null;

  const avgDurationAgg = await prisma.$queryRaw<{ avg_days: number | null }[]>`
    SELECT AVG(EXTRACT(EPOCH FROM ("actualEndDate" - "startDate")) / 86400) AS avg_days
    FROM "Project"
    WHERE "actualEndDate" IS NOT NULL AND "startDate" IS NOT NULL
  `;
  const averageProjectDurationDays = avgDurationAgg[0]?.avg_days != null ? round2(Number(avgDurationAgg[0].avg_days)) : null;

  const netProfit = round2(monthlyRevenue - monthlyExpenses);

  const cards = [
    { key: 'totalCustomers', label: 'Total Customers', value: totalCustomers, previousValue: totalCustomersPrev, percentChange: percentChange(totalCustomers, totalCustomersPrev), href: '/customers' },
    { key: 'activeProjects', label: 'Active Projects', value: activeProjects, previousValue: activeProjectsPrev, percentChange: percentChange(activeProjects, activeProjectsPrev), href: '/projects' },
    { key: 'pendingServiceRequests', label: 'Pending Service Requests', value: pendingServiceRequests, href: '/service-requests' },
    { key: 'pendingQuotations', label: 'Pending Quotations', value: pendingQuotations, href: '/quotations' },
    { key: 'monthlyRevenue', label: 'Monthly Revenue (USD)', value: monthlyRevenue, previousValue: monthlyRevenuePrev, percentChange: percentChange(monthlyRevenue, monthlyRevenuePrev), format: 'currency', href: '/reports/revenue' },
    { key: 'completedProjects', label: 'Completed Projects', value: completedProjects, previousValue: completedProjectsPrev, percentChange: percentChange(completedProjects, completedProjectsPrev), href: '/projects?status=COMPLETED' },
    { key: 'pendingPayments', label: 'Pending Payments', value: pendingPaymentsAgg._count, secondaryValue: round2(Number(pendingPaymentsAgg._sum.balance ?? 0)), format: 'currency-count', href: '/invoices' },
    { key: 'activeTechnicians', label: 'Active Technicians', value: activeTechnicians, href: '/technicians' },
  ];

  const performance = {
    monthlyRevenue,
    monthlyExpenses,
    netProfit,
    projectCompletionRatePercent: completionRatePercent,
    averageProjectDurationDays,
    customerSatisfactionAverage: satisfaction.averageRating,
    outstandingBalance: round2(Number(outstandingAgg._sum.balance ?? 0)),
  };

  return { role: user.role, range: { from, to }, cards, performance };
}

/** Revenue Analytics — Area Chart series. */
export async function getRevenueSeries(query: RangeQuery, granularity: 'day' | 'month' = 'day') {
  const { from, to } = resolveDateRange(query.range, query.from, query.to);
  const payments = await prisma.payment.findMany({ where: { paidAt: { gte: from, lte: to }, reversedAt: null } });

  const buckets = new Map<string, number>();
  for (const p of payments) {
    const key = granularity === 'day' ? p.paidAt.toISOString().slice(0, 10) : p.paidAt.toISOString().slice(0, 7);
    buckets.set(key, round2((buckets.get(key) ?? 0) + Number(p.amount)));
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, revenue]) => ({ period, revenue }));
}

/** Project Statistics — Bar Chart series, grouped by status. Technicians are scoped to their own assignments. */
export async function getProjectStats(user: AuthUser, query: RangeQuery) {
  const { from, to } = resolveDateRange(query.range, query.from, query.to);

  const where =
    user.role === Role.TECHNICIAN
      ? { createdAt: { gte: from, lte: to }, tasks: { some: { assignments: { some: { technicianId: user.id } } } } }
      : { createdAt: { gte: from, lte: to } };

  const grouped = await prisma.project.groupBy({ by: ['status'], _count: true, where });
  return grouped.map((g) => ({ status: g.status, count: g._count }));
}

/** Expense Analysis — Line Chart series, one series per category. */
export async function getExpenseSeries(query: RangeQuery, granularity: 'day' | 'month' = 'day') {
  const { from, to } = resolveDateRange(query.range, query.from, query.to);
  const expenses = await prisma.expense.findMany({ where: { status: ExpenseStatus.APPROVED, date: { gte: from, lte: to } } });

  const buckets = new Map<string, Record<string, number>>();
  for (const e of expenses) {
    const key = granularity === 'day' ? e.date.toISOString().slice(0, 10) : e.date.toISOString().slice(0, 7);
    const bucket = buckets.get(key) ?? {};
    bucket[e.category] = round2((bucket[e.category] ?? 0) + Number(e.amount));
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, byCategory]) => ({ period, ...byCategory }));
}

/** Service Distribution — Pie Chart, Projects grouped by Service Category. */
export async function getServiceDistribution() {
  const projects = await prisma.project.findMany({
    select: { quotation: { select: { serviceRequest: { select: { serviceCategory: { select: { name: true } } } } } } },
  });
  const counts = new Map<string, number>();
  for (const p of projects) {
    const name = p.quotation.serviceRequest.serviceCategory.name;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
}

/** Recent Activity — unified timeline merging logins, new customers, quotations, completed projects, payments. */
export async function getActivityFeed(page: number, pageSize: number) {
  const take = page * pageSize; // fetch enough from each source, then merge+slice
  const [logins, customers, quotations, completedProjects, payments] = await Promise.all([
    prisma.auditLog.findMany({ where: { action: 'LOGIN' }, orderBy: { createdAt: 'desc' }, take, include: { actor: { select: { fullName: true } } } }),
    prisma.customer.findMany({ orderBy: { createdAt: 'desc' }, take, select: { id: true, fullName: true, createdAt: true } }),
    prisma.quotation.findMany({ orderBy: { createdAt: 'desc' }, take, select: { id: true, quotationNo: true, total: true, createdAt: true } }),
    prisma.project.findMany({ where: { status: ProjectStatus.COMPLETED }, orderBy: { actualEndDate: 'desc' }, take, select: { id: true, projectNo: true, actualEndDate: true } }),
    prisma.payment.findMany({ orderBy: { paidAt: 'desc' }, take, select: { id: true, amount: true, paidAt: true, invoice: { select: { invoiceNo: true } } } }),
  ]);

  const events = [
    ...logins.map((l) => ({ type: 'LOGIN' as const, at: l.createdAt, id: l.id, description: `${l.actor?.fullName ?? 'A user'} logged in` })),
    ...customers.map((c) => ({ type: 'NEW_CUSTOMER' as const, at: c.createdAt, id: c.id, description: `New customer registered: ${c.fullName}` })),
    ...quotations.map((q) => ({ type: 'NEW_QUOTATION' as const, at: q.createdAt, id: q.id, description: `Quotation ${q.quotationNo} created — ${q.total}` })),
    ...completedProjects.map((p) => ({ type: 'PROJECT_COMPLETED' as const, at: p.actualEndDate ?? new Date(0), id: p.id, description: `Project ${p.projectNo} completed` })),
    ...payments.map((p) => ({ type: 'PAYMENT' as const, at: p.paidAt, id: p.id, description: `Payment of ${p.amount} received for ${p.invoice.invoiceNo}` })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  const total = events.length;
  const items = events.slice((page - 1) * pageSize, page * pageSize);
  return { items, total, page, pageSize };
}

export async function getLoginActivity(page: number, pageSize: number) {
  const where = { action: 'LOGIN' };
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, fullName: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

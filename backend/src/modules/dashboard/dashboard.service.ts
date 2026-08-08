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
    avgDurationAgg,
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
    prisma.$queryRaw<{ avg_days: number | null }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("actualEndDate" - "startDate")) / 86400) AS avg_days
      FROM "Project"
      WHERE "actualEndDate" IS NOT NULL AND "startDate" IS NOT NULL
    `,
  ]);

  const totalProjectsForRate = completionRateAgg.reduce((sum, g) => sum + g._count, 0);
  const closedOrCompleted = completionRateAgg
    .filter((g) => g.status === ProjectStatus.COMPLETED || g.status === ProjectStatus.CLOSED)
    .reduce((sum, g) => sum + g._count, 0);
  const completionRatePercent = totalProjectsForRate > 0 ? round2((closedOrCompleted / totalProjectsForRate) * 100) : null;

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

/** Revenue Analytics — Area Chart series. Bucketed in SQL (date_trunc) rather than pulling every Payment row into Node. */
export async function getRevenueSeries(query: RangeQuery, granularity: 'day' | 'month' = 'day') {
  const { from, to } = resolveDateRange(query.range, query.from, query.to);
  const rows = await prisma.$queryRaw<{ period: Date; revenue: number }[]>`
    SELECT date_trunc(${granularity}, "paidAt") AS period, SUM(amount)::float AS revenue
    FROM "Payment"
    WHERE "paidAt" >= ${from} AND "paidAt" <= ${to} AND "reversedAt" IS NULL
    GROUP BY period
    ORDER BY period ASC
  `;
  const sliceLen = granularity === 'day' ? 10 : 7;
  return rows.map((r) => ({ period: r.period.toISOString().slice(0, sliceLen), revenue: round2(Number(r.revenue)) }));
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

/** Expense Analysis — Line Chart series, one series per category. Bucketed+grouped in SQL rather than pulling every Expense row into Node. */
export async function getExpenseSeries(query: RangeQuery, granularity: 'day' | 'month' = 'day') {
  const { from, to } = resolveDateRange(query.range, query.from, query.to);
  const rows = await prisma.$queryRaw<{ period: Date; category: string; total: number }[]>`
    SELECT date_trunc(${granularity}, "date") AS period, category, SUM(amount)::float AS total
    FROM "Expense"
    WHERE status = 'APPROVED' AND "date" >= ${from} AND "date" <= ${to}
    GROUP BY period, category
    ORDER BY period ASC
  `;
  const sliceLen = granularity === 'day' ? 10 : 7;
  const buckets = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const key = r.period.toISOString().slice(0, sliceLen);
    const bucket = buckets.get(key) ?? {};
    bucket[r.category] = round2(Number(r.total));
    buckets.set(key, bucket);
  }
  return Array.from(buckets.entries()).map(([period, byCategory]) => ({ period, ...byCategory }));
}

/** Service Distribution — Pie Chart, Projects grouped by Service Category. Grouped in SQL rather than pulling every Project row into Node. */
export async function getServiceDistribution() {
  const rows = await prisma.$queryRaw<{ name: string; value: bigint }[]>`
    SELECT sc.name AS name, COUNT(*)::bigint AS value
    FROM "Project" p
    JOIN "Quotation" q ON q.id = p."quotationId"
    JOIN "ServiceRequest" sr ON sr.id = q."serviceRequestId"
    JOIN "ServiceCategory" sc ON sc.id = sr."serviceCategoryId"
    GROUP BY sc.name
    ORDER BY value DESC
  `;
  return rows.map((r) => ({ name: r.name, value: Number(r.value) }));
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

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60_000));
}

/** Milestone/deadline countdown panel + headline figures for the dashboard hero section. */
export async function getUpcomingSummary(user: AuthUser) {
  const now = new Date();
  const technicianScope = user.role === Role.TECHNICIAN ? { assignments: { some: { technicianId: user.id } } } : {};

  const [nextMilestone, nextTask, pendingQuotationsAgg, inProgressTaskCount, monthlyRevenue] = await Promise.all([
    prisma.projectMilestone.findFirst({
      where: { status: { in: ['PENDING', 'IN_PROGRESS'] }, targetDate: { gte: now } },
      orderBy: { targetDate: 'asc' },
      include: { project: { select: { projectNo: true } } },
    }),
    prisma.task.findFirst({
      where: { status: { notIn: [TaskStatus.VERIFIED] }, dueDate: { gte: now }, ...technicianScope },
      orderBy: { dueDate: 'asc' },
      select: { title: true, dueDate: true, project: { select: { projectNo: true } } },
    }),
    prisma.quotation.aggregate({ _sum: { total: true }, _count: true, where: { status: QuotationStatus.SENT } }),
    prisma.task.count({ where: { status: { in: [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS] }, ...technicianScope } }),
    sumPayments(new Date(now.getFullYear(), now.getMonth(), 1), now),
  ]);

  const isTechnician = user.role === Role.TECHNICIAN;

  return {
    nextMilestone: nextMilestone
      ? { label: `${nextMilestone.project.projectNo} — ${nextMilestone.name}`, daysLeft: daysUntil(nextMilestone.targetDate!) }
      : null,
    nextDeadline: nextTask ? { label: `${nextTask.project.projectNo} — ${nextTask.title}`, daysLeft: daysUntil(nextTask.dueDate!) } : null,
    inProgressTaskCount,
    ...(isTechnician
      ? {}
      : {
          pendingQuotationsValue: round2(Number(pendingQuotationsAgg._sum.total ?? 0)),
          pendingQuotationsCount: pendingQuotationsAgg._count,
          monthlyRevenue,
        }),
  };
}

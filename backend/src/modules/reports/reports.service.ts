import { ExpenseStatus, InvoiceStatus, ProjectStatus, QuotationStatus, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getTechnicianProductivity } from '@/modules/technicians/technicians.service';

function bucketKey(date: Date, granularity: 'day' | 'month') {
  return granularity === 'day' ? date.toISOString().slice(0, 10) : date.toISOString().slice(0, 7);
}

/** FR-REP-01: cash-basis Revenue Report, bucketed by day or month, from recorded (non-reversed) Payments. */
export async function getRevenueReport(from: Date, to: Date, granularity: 'day' | 'month' = 'month') {
  const payments = await prisma.payment.findMany({ where: { paidAt: { gte: from, lte: to }, reversedAt: null } });
  const buckets = new Map<string, number>();
  for (const p of payments) {
    const key = bucketKey(p.paidAt, granularity);
    buckets.set(key, (buckets.get(key) ?? 0) + Number(p.amount));
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, revenue]) => ({ period, revenue: Math.round(revenue * 100) / 100 }));
}

/** FR-REP-02: Project Profitability = Revenue (Invoiced) − Approved Expenses, per Project. */
export async function getProjectProfitabilityReport(filters: { projectId?: string }) {
  const projects = await prisma.project.findMany({
    where: filters.projectId ? { id: filters.projectId } : { status: { in: [ProjectStatus.COMPLETED, ProjectStatus.CLOSED] } },
    include: { invoices: true, expenses: { where: { status: ExpenseStatus.APPROVED } }, customer: { select: { fullName: true } } },
  });

  return projects.map((project) => {
    const revenue = project.invoices.filter((i) => i.status !== InvoiceStatus.CANCELLED).reduce((sum, i) => sum + Number(i.total), 0);
    const expenses = project.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const profit = Math.round((revenue - expenses) * 100) / 100;
    return {
      projectId: project.id,
      projectNo: project.projectNo,
      customer: project.customer.fullName,
      revenue: Math.round(revenue * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      profit,
      marginPercent: revenue > 0 ? Math.round((profit / revenue) * 10000) / 100 : null,
    };
  });
}

/** FR-REP-03: Technician Productivity across the whole roster. */
export async function getTechnicianProductivityReport() {
  const technicians = await prisma.user.findMany({ where: { role: Role.TECHNICIAN }, select: { id: true, fullName: true } });
  return Promise.all(
    technicians.map(async (t) => ({ technicianId: t.id, fullName: t.fullName, ...(await getTechnicianProductivity(t.id)) })),
  );
}

/** FR-REP-04: Outstanding Receivables, aged by days overdue. */
export async function getOutstandingReceivablesReport() {
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] } },
    include: { customer: { select: { fullName: true } } },
    orderBy: { dueDate: 'asc' },
  });
  const now = Date.now();
  return invoices.map((inv) => ({
    invoiceNo: inv.invoiceNo,
    customer: inv.customer.fullName,
    total: Number(inv.total),
    balance: Number(inv.balance),
    dueDate: inv.dueDate,
    daysOverdue: Math.max(0, Math.floor((now - inv.dueDate.getTime()) / (24 * 60 * 60_000))),
  }));
}

/** FR-REP-05: Quotation Conversion Report. */
export async function getQuotationConversionReport() {
  const [sent, approved, rejected, expired] = await Promise.all([
    prisma.quotation.count({ where: { status: { in: [QuotationStatus.SENT, QuotationStatus.APPROVED, QuotationStatus.REJECTED, QuotationStatus.EXPIRED] } } }),
    prisma.quotation.count({ where: { status: QuotationStatus.APPROVED } }),
    prisma.quotation.count({ where: { status: QuotationStatus.REJECTED } }),
    prisma.quotation.count({ where: { status: QuotationStatus.EXPIRED } }),
  ]);
  return { sent, approved, rejected, expired, conversionRatePercent: sent > 0 ? Math.round((approved / sent) * 10000) / 100 : null };
}

/** FR-REP-07: average post-completion feedback rating. */
export async function getCustomerSatisfactionReport() {
  const result = await prisma.customerFeedback.aggregate({ _avg: { rating: true }, _count: { rating: true } });
  return { averageRating: result._avg.rating ?? null, responses: result._count.rating };
}

/** Section 11 KPIs + Section 8.2 role dashboards, condensed into one summary payload. */
export async function getDashboardSummary(userId: string, role: Role) {
  if (role === Role.CUSTOMER) {
    const customer = await prisma.customer.findUnique({ where: { userId } });
    if (!customer) return {};
    const [activeServiceRequests, pendingQuotations, activeProjects, invoices] = await Promise.all([
      prisma.serviceRequest.count({ where: { customerId: customer.id, status: { notIn: ['CLOSED', 'REJECTED'] } } }),
      prisma.quotation.count({ where: { customerId: customer.id, status: QuotationStatus.SENT } }),
      prisma.project.count({ where: { customerId: customer.id, status: { notIn: [ProjectStatus.CLOSED, ProjectStatus.CANCELLED] } } }),
      prisma.invoice.count({ where: { customerId: customer.id, status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] } } }),
    ]);
    return { activeServiceRequests, pendingQuotations, activeProjects, unpaidInvoices: invoices };
  }

  if (role === Role.TECHNICIAN) {
    const [todayTasks, upcomingTasks] = await Promise.all([
      prisma.task.count({ where: { assignments: { some: { technicianId: userId } }, dueDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)), lt: new Date(new Date().setHours(23, 59, 59, 999)) } } }),
      prisma.task.count({ where: { assignments: { some: { technicianId: userId } }, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } } }),
    ]);
    return { todayTasks, upcomingTasks };
  }

  if (role === Role.ACCOUNTANT) {
    const [outstanding, paidThisMonth, expensesPending] = await Promise.all([
      prisma.invoice.aggregate({ _sum: { balance: true }, where: { status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: new Date(new Date().setDate(1)) }, reversedAt: null } }),
      prisma.expense.count({ where: { status: ExpenseStatus.SUBMITTED } }),
    ]);
    return {
      outstandingReceivables: Number(outstanding._sum.balance ?? 0),
      paymentsThisMonth: Number(paidThisMonth._sum.amount ?? 0),
      pendingExpenseApprovals: expensesPending,
    };
  }

  // Super Admin / Admin / Project Manager / Supervisor: business-wide KPIs (Section 11).
  const [totalCustomers, activeProjects, pendingQuotations, monthRevenue, outstanding] = await Promise.all([
    prisma.customer.count({ where: { status: 'ACTIVE' } }),
    prisma.project.count({ where: { status: { notIn: [ProjectStatus.CLOSED, ProjectStatus.CANCELLED] } } }),
    prisma.quotation.count({ where: { status: QuotationStatus.SENT } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: new Date(new Date().setDate(1)) }, reversedAt: null } }),
    prisma.invoice.aggregate({ _sum: { balance: true }, where: { status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] } } }),
  ]);
  return {
    totalCustomers,
    activeProjects,
    pendingQuotations,
    monthRevenue: Number(monthRevenue._sum.amount ?? 0),
    outstandingReceivables: Number(outstanding._sum.balance ?? 0),
  };
}

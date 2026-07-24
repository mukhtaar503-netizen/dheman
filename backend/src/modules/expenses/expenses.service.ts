import { ExpenseCategory, ExpenseStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { recordAudit } from '@/utils/audit';
import { getSettings } from '@/modules/settings/settings.service';
import { AuthUser } from '@/middleware/auth';

export async function createExpense(
  actor: AuthUser,
  input: { projectId?: string; category: ExpenseCategory; amount: number; date: Date; description?: string; receiptUrl?: string },
) {
  const expense = await prisma.expense.create({ data: { ...input, submittedById: actor.id } });
  await recordAudit({ actorId: actor.id, action: 'CREATE', entityType: 'Expense', entityId: expense.id, after: expense });
  return expense;
}

export async function listExpenses(filters: { projectId?: string; status?: ExpenseStatus; page: number; pageSize: number }) {
  const where = { ...(filters.projectId ? { projectId: filters.projectId } : {}), ...(filters.status ? { status: filters.status } : {}) };
  const [items, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      include: { submittedBy: { select: { id: true, fullName: true } } },
    }),
    prisma.expense.count({ where }),
  ]);
  return { items, total, page: filters.page, pageSize: filters.pageSize };
}

export async function getExpenseById(id: string) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) throw HttpError.notFound('Expense not found');
  return expense;
}

/** FR-EXP-03 / BR-EXP-01: Accountant/Admin approval required before an Expense counts toward Project cost. */
export async function decideExpense(actor: AuthUser, id: string, decision: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
  const expense = await getExpenseById(id);
  if (expense.status !== ExpenseStatus.SUBMITTED) {
    throw HttpError.badRequest('Only a Submitted Expense can be approved or rejected');
  }
  if (decision === 'REJECTED' && !rejectionReason) {
    // BR-EXP-02: rejected expenses are retained with a mandatory rejection reason.
    throw HttpError.badRequest('A rejection reason is required');
  }

  const settings = await getSettings();
  if (decision === 'APPROVED' && Number(expense.amount) > Number(settings.expenseApprovalThreshold) && actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN') {
    throw HttpError.forbidden('Expenses above the configured threshold require Admin or Super Admin approval');
  }

  const updated = await prisma.expense.update({
    where: { id },
    data: { status: decision, approvedById: actor.id, rejectionReason: decision === 'REJECTED' ? rejectionReason : null },
  });
  await recordAudit({ actorId: actor.id, action: decision, entityType: 'Expense', entityId: id, before: expense, after: updated });
  return updated;
}

/** Aggregate Approved expenses for Project Profitability Reporting (FR-EXP-04). */
export async function getApprovedExpenseTotal(projectId: string) {
  const result = await prisma.expense.aggregate({ where: { projectId, status: ExpenseStatus.APPROVED }, _sum: { amount: true } });
  return Number(result._sum.amount ?? 0);
}

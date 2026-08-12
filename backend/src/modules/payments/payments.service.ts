import { InvoiceStatus, PaymentMethod } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { recordAudit } from '@/utils/audit';
import { notify } from '@/utils/notify';
import { AuthUser } from '@/middleware/auth';

/** FR-PAY-01/02/05, BR-PAY-01, BR-PAY-03: record a payment, enforce it never exceeds the outstanding
 * balance, and roll the Invoice's amountPaid/balance/status forward atomically. */
export async function recordPayment(actor: AuthUser, input: { invoiceId: string; amount: number; method: PaymentMethod; referenceNo?: string; paidAt?: Date }) {
  const invoice = await prisma.invoice.findUnique({ where: { id: input.invoiceId } });
  if (!invoice) throw HttpError.notFound('Invoice not found');
  if (invoice.status === InvoiceStatus.CANCELLED) throw HttpError.badRequest('Cannot record a payment against a cancelled Invoice');

  const currentBalance = Number(invoice.balance);
  if (input.amount > currentBalance + 0.01) {
    throw HttpError.badRequest('Payment amount exceeds the Invoice outstanding balance', {
      outstandingBalance: currentBalance,
      attemptedAmount: input.amount,
    });
  }

  const { payment, updatedInvoice } = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        invoiceId: input.invoiceId,
        customerId: invoice.customerId,
        amount: input.amount,
        method: input.method,
        referenceNo: input.referenceNo,
        paidAt: input.paidAt ?? new Date(),
        recordedById: actor.id,
      },
    });

    const newAmountPaid = round2(Number(invoice.amountPaid) + input.amount);
    const newBalance = round2(Number(invoice.total) - newAmountPaid);
    const newStatus = newBalance <= 0.01 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

    const invoiceUpdated = await tx.invoice.update({
      where: { id: input.invoiceId },
      data: { amountPaid: newAmountPaid, balance: Math.max(newBalance, 0), status: newStatus },
    });

    return { payment: created, updatedInvoice: invoiceUpdated };
  });

  await notify({
    userId: actor.id,
    type: 'PAYMENT_RECEIVED',
    title: 'Payment recorded',
    body: `${payment.amount} received against Invoice ${invoice.invoiceNo}`,
    entityType: 'Payment',
    entityId: payment.id,
  });

  await recordAudit({ actorId: actor.id, action: 'CREATE', entityType: 'Payment', entityId: payment.id, after: { payment, invoiceStatus: updatedInvoice.status } });
  return { payment, invoice: updatedInvoice };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function listPayments(filters: { invoiceId?: string; customerId?: string }) {
  return prisma.payment.findMany({
    where: { ...(filters.invoiceId ? { invoiceId: filters.invoiceId } : {}), ...(filters.customerId ? { customerId: filters.customerId } : {}) },
    orderBy: { paidAt: 'desc' },
    take: 200, // defensive bound — this endpoint has no pagination UI; a call with no filters at all should not return the whole table
  });
}

/** Paginated/searchable/sortable variant backing the dashboard's Recent Payments table (FR-REP, Section "Recent Activity"). */
export async function listPaymentsPaged(filters: {
  search?: string;
  method?: PaymentMethod;
  from?: Date;
  to?: Date;
  sortBy?: 'paidAt' | 'amount';
  sortOrder?: 'asc' | 'desc';
  page: number;
  pageSize: number;
}) {
  const where = {
    ...(filters.method ? { method: filters.method } : {}),
    ...(filters.from || filters.to ? { paidAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } } : {}),
    ...(filters.search
      ? {
          OR: [
            { referenceNo: { contains: filters.search, mode: 'insensitive' as const } },
            { customer: { fullName: { contains: filters.search, mode: 'insensitive' as const } } },
            { invoice: { invoiceNo: { contains: filters.search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { customer: { select: { id: true, fullName: true } }, invoice: { select: { id: true, invoiceNo: true } } },
      orderBy: { [filters.sortBy ?? 'paidAt']: filters.sortOrder ?? 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.payment.count({ where }),
  ]);

  return { items, total, page: filters.page, pageSize: filters.pageSize };
}

export async function getPaymentById(id: string) {
  const payment = await prisma.payment.findUnique({ where: { id }, include: { invoice: true } });
  if (!payment) throw HttpError.notFound('Payment not found');
  return payment;
}

/** BR-PAY-02: a Payment is never deleted — only reversed, restoring the Invoice's balance. */
export async function reversePayment(actor: AuthUser, id: string, reason: string) {
  const payment = await getPaymentById(id);
  if (payment.reversedAt) throw HttpError.badRequest('This Payment has already been reversed');

  const { reversed } = await prisma.$transaction(async (tx) => {
    const rev = await tx.payment.update({ where: { id }, data: { reversedAt: new Date(), reversalReason: reason } });

    const invoice = payment.invoice;
    const newAmountPaid = round2(Number(invoice.amountPaid) - Number(payment.amount));
    const newBalance = round2(Number(invoice.total) - newAmountPaid);
    const newStatus = newAmountPaid <= 0 ? InvoiceStatus.SENT : InvoiceStatus.PARTIALLY_PAID;

    await tx.invoice.update({ where: { id: invoice.id }, data: { amountPaid: Math.max(newAmountPaid, 0), balance: newBalance, status: newStatus } });
    return { reversed: rev };
  });

  await recordAudit({ actorId: actor.id, action: 'REVERSE', entityType: 'Payment', entityId: id, before: payment, after: reversed });
  return reversed;
}

import { InvoiceStatus, NotificationType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { recordAudit } from '@/utils/audit';
import { notify } from '@/utils/notify';
import { generateReferenceNumber } from '@/utils/numbering';
import { getSettings } from '@/modules/settings/settings.service';
import { AuthUser } from '@/middleware/auth';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** BR-INV-01/02: an Invoice may only be created against a Project with an Approved-Quotation basis, and the
 * cumulative total of all Invoices for a Project may not exceed the agreed Quotation amount. */
export async function createInvoice(actor: AuthUser, input: { projectId: string; lineItems: { description: string; quantity: number; unitPrice: number }[]; dueDate?: Date }) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId }, include: { quotation: true, invoices: true } });
  if (!project) throw HttpError.notFound('Project not found');

  const subtotal = round2(input.lineItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0));
  const settings = await getSettings();
  const taxAmount = round2(subtotal * (Number(project.quotation.taxRatePercent) / 100));
  const total = round2(subtotal + taxAmount);

  const alreadyInvoiced = project.invoices.filter((i) => i.status !== InvoiceStatus.CANCELLED).reduce((sum, i) => sum + Number(i.total), 0);
  if (alreadyInvoiced + total > Number(project.quotation.total) + 0.01) {
    throw HttpError.badRequest('Total invoiced amount would exceed the agreed Quotation total', {
      quotationTotal: project.quotation.total,
      alreadyInvoiced,
      attemptedInvoiceTotal: total,
    });
  }

  const invoiceNo = await generateReferenceNumber('INV', 'invoice');
  const dueDate = input.dueDate ?? new Date(Date.now() + settings.invoiceDueDays * 24 * 60 * 60_000);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNo,
      projectId: input.projectId,
      customerId: project.customerId,
      subtotal,
      taxAmount,
      total,
      balance: total,
      dueDate,
      lineItems: { create: input.lineItems.map((i) => ({ ...i, subtotal: round2(i.quantity * i.unitPrice) })) },
    },
    include: { lineItems: true },
  });

  await recordAudit({ actorId: actor.id, action: 'CREATE', entityType: 'Invoice', entityId: invoice.id, after: invoice });
  return invoice;
}

export async function getInvoiceById(id: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: { lineItems: true, payments: true, customer: true, project: true } });
  if (!invoice) throw HttpError.notFound('Invoice not found');
  return invoice;
}

export async function listInvoices(filters: { projectId?: string; customerId?: string; status?: InvoiceStatus; page: number; pageSize: number }) {
  const where = {
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };
  const [items, total] = await Promise.all([
    // The invoices list page and the record-payment picker only read the invoice's own scalar
    // fields (invoiceNo/total/balance/status/dueDate) — lineItems is a detail-page-only relation
    // (see getInvoiceById), so it's deliberately not included here.
    prisma.invoice.findMany({
      where,
      orderBy: { issueDate: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);
  return { items, total, page: filters.page, pageSize: filters.pageSize };
}

export async function sendInvoice(actor: AuthUser, id: string) {
  const invoice = await getInvoiceById(id);
  if (invoice.status !== InvoiceStatus.DRAFT) throw HttpError.badRequest('Only a Draft Invoice can be sent');

  const updated = await prisma.invoice.update({ where: { id }, data: { status: InvoiceStatus.SENT } });

  const customer = await prisma.customer.findUnique({ where: { id: invoice.customerId } });
  if (customer?.userId) {
    await notify({
      userId: customer.userId,
      type: NotificationType.INVOICE_ISSUED,
      title: 'A new Invoice has been issued',
      body: `${invoice.invoiceNo} — total ${invoice.total}`,
      entityType: 'Invoice',
      entityId: id,
    });
  }

  await recordAudit({ actorId: actor.id, action: 'SEND', entityType: 'Invoice', entityId: id, before: invoice, after: updated });
  return updated;
}

/** BR-INV-03: a Paid Invoice cannot be edited/voided; BR-INV: void retains the record for audit, never deletes. */
export async function voidInvoice(actor: AuthUser, id: string, reason: string) {
  const invoice = await getInvoiceById(id);
  if (invoice.status === InvoiceStatus.PAID) {
    throw HttpError.badRequest('A Paid Invoice cannot be voided; issue a Credit Note instead');
  }
  const updated = await prisma.invoice.update({ where: { id }, data: { status: InvoiceStatus.CANCELLED, voidReason: reason } });
  await recordAudit({ actorId: actor.id, action: 'VOID', entityType: 'Invoice', entityId: id, before: invoice, after: updated });
  return updated;
}

/** FR-INV-05: sweep to flag Invoices past their due date as Overdue — intended for a scheduled job. */
export async function markOverdueInvoices() {
  const result = await prisma.invoice.updateMany({
    where: { status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID] }, dueDate: { lt: new Date() } },
    data: { status: InvoiceStatus.OVERDUE },
  });
  return result.count;
}

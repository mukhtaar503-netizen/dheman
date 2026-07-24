import { NotificationType, QuotationStatus, ServiceRequestStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { recordAudit } from '@/utils/audit';
import { notify } from '@/utils/notify';
import { generateReferenceNumber } from '@/utils/numbering';
import { getSettings } from '@/modules/settings/settings.service';
import { AuthUser } from '@/middleware/auth';

interface LineItemInput {
  serviceCategoryId?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function computeTotals(lineItems: LineItemInput[], taxRatePercent: number, discountType?: 'PERCENTAGE' | 'FIXED', discountValue?: number) {
  const subtotal = round2(lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
  const discountAmount = round2(
    !discountType || !discountValue ? 0 : discountType === 'PERCENTAGE' ? subtotal * (discountValue / 100) : discountValue,
  );
  const taxableBase = Math.max(subtotal - discountAmount, 0);
  const taxAmount = round2(taxableBase * (taxRatePercent / 100));
  const total = round2(taxableBase + taxAmount);
  return { subtotal, taxAmount, total };
}

async function assertLatestSentQuotationConstraint(serviceRequestId: string) {
  // BR-QUOTE-04: only one Quotation per Service Request may be in Sent status at a time.
  const activeSent = await prisma.quotation.findFirst({ where: { serviceRequestId, status: QuotationStatus.SENT } });
  if (activeSent) {
    throw HttpError.conflict('A Quotation for this Service Request is already awaiting customer response');
  }
}

export async function createQuotation(
  actor: AuthUser,
  input: { serviceRequestId: string; lineItems: LineItemInput[]; discountType?: 'PERCENTAGE' | 'FIXED'; discountValue?: number; discountReason?: string },
) {
  const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id: input.serviceRequestId } });
  if (!serviceRequest) throw HttpError.notFound('Service request not found');

  await assertLatestSentQuotationConstraint(input.serviceRequestId);

  const settings = await getSettings();
  const taxRatePercent = Number(settings.taxRatePercent);
  const { subtotal, taxAmount, total } = computeTotals(input.lineItems, taxRatePercent, input.discountType, input.discountValue);

  // BR-QUOTE-02: discount beyond the configured threshold requires Admin/Super Admin approval before sending.
  const discountPercent = input.discountType === 'PERCENTAGE' ? input.discountValue ?? 0 : subtotal ? ((input.discountValue ?? 0) / subtotal) * 100 : 0;
  const requiresApproval = discountPercent > Number(settings.discountApprovalThreshold);
  if (requiresApproval && !input.discountReason) {
    throw HttpError.badRequest('A discount above the approval threshold requires a documented reason');
  }

  const quotationNo = await generateReferenceNumber('QT', 'quotation');
  const validUntil = new Date(Date.now() + settings.quotationValidityDays * 24 * 60 * 60_000);

  const quotation = await prisma.quotation.create({
    data: {
      quotationNo,
      serviceRequestId: input.serviceRequestId,
      customerId: serviceRequest.customerId,
      subtotal,
      taxRatePercent,
      taxAmount,
      discountType: input.discountType,
      discountValue: input.discountValue,
      discountReason: input.discountReason,
      total,
      validUntil,
      createdById: actor.id,
      lineItems: { create: input.lineItems.map((item) => ({ ...item, subtotal: round2(item.quantity * item.unitPrice) })) },
      auditLogs: { create: { action: 'CREATED', actorId: actor.id } },
    },
    include: { lineItems: true },
  });

  await recordAudit({ actorId: actor.id, action: 'CREATE', entityType: 'Quotation', entityId: quotation.id, after: quotation });
  return { quotation, requiresDiscountApproval: requiresApproval };
}

/** BR-QUOTE-01: revising an Approved Quotation creates a brand-new version instead of mutating it. */
export async function reviseQuotation(actor: AuthUser, originalId: string, input: Parameters<typeof createQuotation>[1]) {
  const original = await getQuotationById(originalId);
  const { quotation } = await createQuotation(actor, { ...input, serviceRequestId: original.serviceRequestId });

  const revised = await prisma.quotation.update({
    where: { id: quotation.id },
    data: { version: original.version + 1 },
  });
  await prisma.quotationAuditLog.create({ data: { quotationId: originalId, action: 'REVISED', actorId: actor.id, note: `Superseded by ${revised.quotationNo}` } });
  return revised;
}

export async function getQuotationById(id: string) {
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { lineItems: true, customer: true, serviceRequest: true, auditLogs: { orderBy: { createdAt: 'desc' } } },
  });
  if (!quotation) throw HttpError.notFound('Quotation not found');
  return quotation;
}

export async function listQuotations(filters: { customerId?: string; status?: QuotationStatus; page: number; pageSize: number }) {
  const where = { ...(filters.customerId ? { customerId: filters.customerId } : {}), ...(filters.status ? { status: filters.status } : {}) };
  const [items, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      include: { lineItems: true, customer: true },
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.quotation.count({ where }),
  ]);
  return { items, total, page: filters.page, pageSize: filters.pageSize };
}

export async function approveDiscount(actor: AuthUser, id: string) {
  const quotation = await getQuotationById(id);
  const updated = await prisma.quotation.update({ where: { id }, data: { discountApprovedById: actor.id } });
  await prisma.quotationAuditLog.create({ data: { quotationId: id, action: 'DISCOUNT_APPROVED', actorId: actor.id } });
  return updated;
}

export async function sendQuotation(actor: AuthUser, id: string) {
  const quotation = await getQuotationById(id);
  if (quotation.status !== QuotationStatus.DRAFT) {
    throw HttpError.badRequest('Only a Draft Quotation can be sent');
  }

  const settings = await getSettings();
  if (quotation.discountType && quotation.discountValue) {
    const discountPercent =
      quotation.discountType === 'PERCENTAGE' ? Number(quotation.discountValue) : (Number(quotation.discountValue) / Number(quotation.subtotal || 1)) * 100;
    if (discountPercent > Number(settings.discountApprovalThreshold) && !quotation.discountApprovedById) {
      throw HttpError.forbidden('This Quotation has a discount above the approval threshold and requires Admin approval before sending');
    }
  }

  await assertLatestSentQuotationConstraint(quotation.serviceRequestId);

  const updated = await prisma.$transaction(async (tx) => {
    const sent = await tx.quotation.update({ where: { id }, data: { status: QuotationStatus.SENT, sentAt: new Date() } });
    await tx.serviceRequest.update({ where: { id: quotation.serviceRequestId }, data: { status: ServiceRequestStatus.QUOTATION_SENT } });
    await tx.quotationAuditLog.create({ data: { quotationId: id, action: 'SENT', actorId: actor.id } });
    return sent;
  });

  const customer = await prisma.customer.findUnique({ where: { id: quotation.customerId } });
  if (customer?.userId) {
    await notify({
      userId: customer.userId,
      type: NotificationType.QUOTATION_SENT,
      title: 'A new Quotation is ready for your review',
      body: `${quotation.quotationNo} — total ${quotation.total}`,
      entityType: 'Quotation',
      entityId: id,
    });
  }

  await recordAudit({ actorId: actor.id, action: 'SEND', entityType: 'Quotation', entityId: id, before: quotation, after: updated });
  return updated;
}

/** FR-QUOTE-07: Customer approves or rejects; BR-QUOTE-01 makes an Approved Quotation immutable. */
export async function respondToQuotation(actor: AuthUser, id: string, decision: 'APPROVED' | 'REJECTED', comment?: string) {
  const quotation = await getQuotationById(id);
  if (quotation.status !== QuotationStatus.SENT) {
    throw HttpError.badRequest('Only a Sent Quotation can be approved or rejected');
  }
  if (quotation.validUntil && quotation.validUntil < new Date()) {
    await prisma.quotation.update({ where: { id }, data: { status: QuotationStatus.EXPIRED } });
    throw HttpError.badRequest('This Quotation has expired and can no longer be responded to');
  }

  const status = decision === 'APPROVED' ? QuotationStatus.APPROVED : QuotationStatus.REJECTED;
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.quotation.update({ where: { id }, data: { status, respondedAt: new Date(), customerComment: comment } });
    await tx.serviceRequest.update({
      where: { id: quotation.serviceRequestId },
      data: { status: decision === 'APPROVED' ? ServiceRequestStatus.APPROVED : ServiceRequestStatus.REJECTED },
    });
    await tx.quotationAuditLog.create({ data: { quotationId: id, action: decision, actorId: actor.id, note: comment } });
    return result;
  });

  await recordAudit({ actorId: actor.id, action: decision, entityType: 'Quotation', entityId: id, before: quotation, after: updated });
  return updated;
}

/** Backs FR-QUOTE-08 — intended to run on a scheduled job; also safe to call inline before reads. */
export async function expireOverdueQuotations() {
  const result = await prisma.quotation.updateMany({
    where: { status: QuotationStatus.SENT, validUntil: { lt: new Date() } },
    data: { status: QuotationStatus.EXPIRED },
  });
  return result.count;
}

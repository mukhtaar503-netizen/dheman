import { InspectionStatus, NotificationType, Prisma, QuotationApprovalAction, QuotationItemCategory, QuotationStatus, ServiceRequestStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { recordAudit } from '@/utils/audit';
import { notify } from '@/utils/notify';
import { sendMail } from '@/lib/mailer';
import { generateReferenceNumber } from '@/utils/numbering';
import { getSettings } from '@/modules/settings/settings.service';
import { AuthUser } from '@/middleware/auth';
import { generateQuotationPdf, QUOTATION_PDF_SELECT } from './quotations.pdf.service';

interface LineItemInput {
  serviceCategoryId?: string;
  serviceId?: string;
  category: QuotationItemCategory;
  itemName?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Cost Calculation Engine (Section 3 of the spec):
 *   subtotal = materialCost + laborCost + transportationCost  (derived from categorized line items)
 *   discountAmount = subtotal * pct/100, or the fixed value
 *   taxAmount ("VAT") = (subtotal - discountAmount) * vatPercent/100
 *   total = subtotal - discountAmount + taxAmount
 */
function computeTotals(
  lineItems: LineItemInput[],
  vatPercent: number,
  discountType?: 'PERCENTAGE' | 'FIXED',
  discountValue?: number,
) {
  const bucketSum = (category: QuotationItemCategory) =>
    round2(lineItems.filter((i) => i.category === category).reduce((sum, i) => sum + i.quantity * i.unitPrice, 0));

  const materialCost = bucketSum(QuotationItemCategory.MATERIAL);
  const laborCost = bucketSum(QuotationItemCategory.LABOR);
  const transportationCost = bucketSum(QuotationItemCategory.TRANSPORTATION);
  const subtotal = round2(materialCost + laborCost + transportationCost);

  const discountAmount = round2(
    !discountType || !discountValue ? 0 : discountType === 'PERCENTAGE' ? subtotal * (discountValue / 100) : discountValue,
  );
  const taxableBase = Math.max(subtotal - discountAmount, 0);
  const taxAmount = round2(taxableBase * (vatPercent / 100));
  const total = round2(taxableBase + taxAmount);

  return { materialCost, laborCost, transportationCost, subtotal, discountAmount, taxAmount, total };
}

async function assertLatestSentQuotationConstraint(serviceRequestId: string) {
  // BR-QUOTE-04: only one Quotation per Service Request may be in Sent status at a time.
  const activeSent = await prisma.quotation.findFirst({ where: { serviceRequestId, status: QuotationStatus.SENT } });
  if (activeSent) {
    throw HttpError.conflict('A Quotation for this Service Request is already awaiting customer response');
  }
}

/** BR-QUOTE: one Quotation per Site Inspection. Fast, friendly check ahead of the DB's own
 *  `siteInspectionId` unique constraint — the constraint is what actually prevents a duplicate
 *  under a race (e.g. a double-submitted request), this just turns the common case into a
 *  clear message instead of a raw P2002. */
async function assertNoExistingQuotationForInspection(siteInspectionId: string) {
  const existing = await prisma.quotation.findUnique({
    where: { siteInspectionId },
    select: { id: true, quotationNo: true },
  });
  if (existing) {
    throw HttpError.conflict('A quotation already exists for this site inspection.', {
      existingQuotationId: existing.id,
      existingQuotationNo: existing.quotationNo,
    });
  }
}

function isUniqueConstraintViolation(err: unknown, field: string): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002' &&
    Array.isArray(err.meta?.target) &&
    (err.meta!.target as string[]).includes(field)
  );
}

interface CreateQuotationInput {
  serviceRequestId: string;
  siteInspectionId?: string;
  title?: string;
  description?: string;
  lineItems: LineItemInput[];
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  discountReason?: string;
  vatPercentage?: number;
  validityDays?: number;
  notes?: string;
  termsAndConditions?: string;
}

export async function createQuotation(actor: AuthUser, input: CreateQuotationInput) {
  const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id: input.serviceRequestId } });
  if (!serviceRequest) throw HttpError.notFound('Service request not found');

  if (input.siteInspectionId) {
    const inspection = await prisma.siteInspection.findUnique({ where: { id: input.siteInspectionId } });
    if (!inspection) throw HttpError.notFound('Site inspection not found');
    if (inspection.serviceRequestId !== input.serviceRequestId) {
      throw HttpError.badRequest('This Site Inspection does not belong to the given Service Request');
    }
    await assertNoExistingQuotationForInspection(input.siteInspectionId);
  }

  await assertLatestSentQuotationConstraint(input.serviceRequestId);

  const settings = await getSettings();
  const vatPercent = input.vatPercentage ?? Number(settings.taxRatePercent);
  const { materialCost, laborCost, transportationCost, subtotal, discountAmount, taxAmount, total } = computeTotals(
    input.lineItems,
    vatPercent,
    input.discountType,
    input.discountValue,
  );

  // BR-QUOTE-02: discount beyond the configured threshold requires Admin/Super Admin approval before sending.
  const discountPercent = input.discountType === 'PERCENTAGE' ? input.discountValue ?? 0 : subtotal ? (discountAmount / subtotal) * 100 : 0;
  const requiresApproval = discountPercent > Number(settings.discountApprovalThreshold);
  if (requiresApproval && !input.discountReason) {
    throw HttpError.badRequest('A discount above the approval threshold requires a documented reason');
  }

  const validityDays = input.validityDays ?? settings.quotationValidityDays;
  const validUntil = new Date(Date.now() + validityDays * 24 * 60 * 60_000);

  // generateReferenceNumber counts existing rows rather than using a DB sequence, so two
  // near-simultaneous creates (e.g. a double-submitted request) can compute the same
  // quotationNo — the first insert wins and the second hits quotationNo's unique constraint.
  // That's a transient numbering collision, not a real conflict, so it's retried with a fresh
  // number instead of surfacing a raw P2002 to the user. A genuine siteInspectionId collision
  // (the one-quotation-per-inspection rule, lost to a race against the check above) is not
  // retried — it's translated into the same friendly "already exists" error.
  const MAX_ATTEMPTS = 3;
  let quotation: Prisma.QuotationGetPayload<{ include: { lineItems: true } }> | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const quotationNo = await generateReferenceNumber('QT', 'quotation');
    try {
      quotation = await prisma.quotation.create({
        data: {
          quotationNo,
          serviceRequestId: input.serviceRequestId,
          siteInspectionId: input.siteInspectionId,
          customerId: serviceRequest.customerId,
          title: input.title,
          description: input.description,
          materialCost,
          laborCost,
          transportationCost,
          subtotal,
          taxRatePercent: vatPercent,
          taxAmount,
          discountType: input.discountType,
          discountValue: input.discountValue,
          discountAmount,
          discountReason: input.discountReason,
          total,
          validityDays,
          validUntil,
          notes: input.notes,
          termsAndConditions: input.termsAndConditions,
          createdById: actor.id,
          lineItems: {
            create: input.lineItems.map((item) => ({
              serviceCategoryId: item.serviceCategoryId,
              serviceId: item.serviceId,
              category: item.category,
              itemName: item.itemName,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              subtotal: round2(item.quantity * item.unitPrice),
            })),
          },
          auditLogs: { create: { action: 'CREATED', actorId: actor.id } },
        },
        include: { lineItems: true },
      });
      break;
    } catch (err) {
      if (isUniqueConstraintViolation(err, 'siteInspectionId')) {
        // Lost the race against another request creating a Quotation for the same inspection.
        await assertNoExistingQuotationForInspection(input.siteInspectionId!);
        throw err; // assertNoExistingQuotationForInspection always throws when this fires; unreachable
      }
      if (isUniqueConstraintViolation(err, 'quotationNo') && attempt < MAX_ATTEMPTS) {
        continue;
      }
      throw err;
    }
  }

  if (!quotation) throw HttpError.conflict('Could not generate a unique quotation number — please try again');

  await recordAudit({ actorId: actor.id, action: 'CREATE', entityType: 'Quotation', entityId: quotation.id, after: quotation });
  return { quotation, requiresDiscountApproval: requiresApproval };
}

/** BR-QUOTE-01: revising an Approved Quotation creates a brand-new version instead of mutating it. */
export async function reviseQuotation(actor: AuthUser, originalId: string, input: Omit<CreateQuotationInput, 'serviceRequestId'>) {
  const original = await getQuotationById(originalId);
  const { quotation } = await createQuotation(actor, { ...input, serviceRequestId: original.serviceRequestId });

  const revised = await prisma.quotation.update({
    where: { id: quotation.id },
    data: { version: original.version + 1 },
  });
  await prisma.quotationAuditLog.create({
    data: { quotationId: originalId, action: 'REVISED', actorId: actor.id, note: `Superseded by ${revised.quotationNo}` },
  });
  return revised;
}

/** Feeds the Create Quotation form once a Site Inspection is selected — customer/service/cost-estimate auto-load. */
export async function getQuotationPrefill(siteInspectionId: string) {
  const inspection = await prisma.siteInspection.findUnique({
    where: { id: siteInspectionId },
    include: { serviceRequest: { include: { customer: true, serviceCategory: true, service: true } } },
  });
  if (!inspection) throw HttpError.notFound('Site inspection not found');
  if (inspection.status !== InspectionStatus.COMPLETED) {
    throw HttpError.badRequest('Only a completed Site Inspection can be used to prefill a Quotation');
  }

  const materialItems = ((inspection.materialEstimate as { material: string; quantity: string; estimatedCost: number }[] | null) ?? []).map(
    (m) => ({
      category: QuotationItemCategory.MATERIAL,
      itemName: m.material,
      description: m.material,
      quantity: 1,
      unit: m.quantity,
      unitPrice: m.estimatedCost,
    }),
  );
  const laborItems = ((inspection.laborEstimate as { task: string; estimatedHours: number; cost: number }[] | null) ?? []).map((l) => ({
    category: QuotationItemCategory.LABOR,
    itemName: l.task,
    description: `${l.task} (${l.estimatedHours}h)`,
    quantity: 1,
    unit: 'job',
    unitPrice: l.cost,
  }));

  // Surfaced as soon as the inspection is picked, before the user fills out the whole form,
  // so the frontend can show "A quotation already exists" + a link to it right away instead of
  // only failing at final submit.
  const existingQuotation = await prisma.quotation.findUnique({
    where: { siteInspectionId },
    select: { id: true, quotationNo: true },
  });

  return {
    serviceRequest: inspection.serviceRequest,
    customer: inspection.serviceRequest.customer,
    siteInspection: inspection,
    suggestedLineItems: [...materialItems, ...laborItems],
    existingQuotation,
  };
}

export async function getQuotationById(id: string) {
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      lineItems: true,
      customer: { select: { id: true, fullName: true, companyName: true, email: true, phone: true, userId: true } },
      serviceRequest: { include: { serviceCategory: true, service: true } },
      siteInspection: true,
      createdBy: { select: { id: true, fullName: true } },
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
      approvals: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });
  if (!quotation) throw HttpError.notFound('Quotation not found');
  return quotation;
}

interface ListQuotationsFilters {
  customerId?: string;
  status?: QuotationStatus;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  amountMin?: number;
  amountMax?: number;
  sort?: 'newest' | 'oldest' | 'amount_high' | 'amount_low';
  page: number;
  pageSize: number;
}

export async function listQuotations(filters: ListQuotationsFilters) {
  const where: Prisma.QuotationWhereInput = {
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? { createdAt: { ...(filters.dateFrom ? { gte: filters.dateFrom } : {}), ...(filters.dateTo ? { lte: filters.dateTo } : {}) } }
      : {}),
    ...(filters.amountMin != null || filters.amountMax != null
      ? { total: { ...(filters.amountMin != null ? { gte: filters.amountMin } : {}), ...(filters.amountMax != null ? { lte: filters.amountMax } : {}) } }
      : {}),
    ...(filters.search
      ? {
          OR: [
            { quotationNo: { contains: filters.search, mode: 'insensitive' } },
            { title: { contains: filters.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.QuotationOrderByWithRelationInput =
    filters.sort === 'oldest'
      ? { createdAt: 'asc' }
      : filters.sort === 'amount_high'
        ? { total: 'desc' }
        : filters.sort === 'amount_low'
          ? { total: 'asc' }
          : { createdAt: 'desc' };

  // The list page (quotations/page.tsx) only reads quotationNo, customer.fullName,
  // serviceRequest.{service.serviceName, serviceCategory.name}, total, status, and createdAt —
  // it never touches lineItems, so the previous `include: { lineItems: true }` was pulling
  // every line item row (description/qty/price per row) for data the list never renders.
  const [items, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      select: {
        id: true,
        quotationNo: true,
        status: true,
        total: true,
        createdAt: true,
        customer: { select: { id: true, fullName: true } },
        serviceRequest: {
          select: {
            id: true,
            serviceCategory: { select: { id: true, name: true } },
            service: { select: { id: true, serviceName: true } },
          },
        },
      },
      orderBy,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.quotation.count({ where }),
  ]);
  return { items, total, page: filters.page, pageSize: filters.pageSize };
}

/** INSPECTOR: view-only access to quotations tied to inspections they performed. */
export async function listQuotationsForInspector(inspectorId: string) {
  // The list page only reads id/quotationNo/total/status/createdAt plus customer.fullName and
  // service/serviceCategory name — select exactly those instead of full line items + customer
  // rows per quotation, and cap defensively since this list has no pagination UI.
  return prisma.quotation.findMany({
    where: { siteInspection: { inspectorId } },
    select: {
      id: true,
      quotationNo: true,
      total: true,
      status: true,
      createdAt: true,
      customer: { select: { fullName: true } },
      serviceRequest: { select: { service: { select: { serviceName: true } }, serviceCategory: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}

interface UpdateQuotationInput {
  title?: string | null;
  description?: string | null;
  lineItems?: LineItemInput[];
  discountType?: 'PERCENTAGE' | 'FIXED' | null;
  discountValue?: number | null;
  discountReason?: string | null;
  vatPercentage?: number;
  validityDays?: number;
  notes?: string | null;
  termsAndConditions?: string | null;
}

/** General edits — DRAFT only. Recomputes cost fields when lineItems/discount/VAT change. */
export async function updateQuotation(actor: AuthUser, id: string, input: UpdateQuotationInput) {
  const before = await getQuotationById(id);
  if (before.status !== QuotationStatus.DRAFT) {
    throw HttpError.badRequest('Only a Draft Quotation can be edited — revise it instead to create a new version');
  }

  const data: Prisma.QuotationUpdateInput = {
    title: input.title,
    description: input.description,
    discountReason: input.discountReason,
    notes: input.notes,
    termsAndConditions: input.termsAndConditions,
  };

  if (input.lineItems || input.discountType !== undefined || input.discountValue !== undefined || input.vatPercentage !== undefined) {
    const lineItems: LineItemInput[] =
      input.lineItems ??
      before.lineItems.map((li) => ({
        serviceCategoryId: li.serviceCategoryId ?? undefined,
        serviceId: li.serviceId ?? undefined,
        category: li.category,
        itemName: li.itemName ?? undefined,
        description: li.description,
        quantity: Number(li.quantity),
        unit: li.unit,
        unitPrice: Number(li.unitPrice),
      }));
    const discountType = input.discountType !== undefined ? (input.discountType ?? undefined) : (before.discountType ?? undefined);
    const discountValue = input.discountValue !== undefined ? (input.discountValue ?? undefined) : before.discountValue != null ? Number(before.discountValue) : undefined;
    const vatPercent = input.vatPercentage ?? Number(before.taxRatePercent);

    const { materialCost, laborCost, transportationCost, subtotal, discountAmount, taxAmount, total } = computeTotals(
      lineItems,
      vatPercent,
      discountType,
      discountValue,
    );

    Object.assign(data, {
      materialCost,
      laborCost,
      transportationCost,
      subtotal,
      taxRatePercent: vatPercent,
      taxAmount,
      discountType,
      discountValue,
      discountAmount,
      total,
    });

    if (input.validityDays) {
      data.validityDays = input.validityDays;
      data.validUntil = new Date(Date.now() + input.validityDays * 24 * 60 * 60_000);
    }

    if (input.lineItems) {
      await prisma.quotationLineItem.deleteMany({ where: { quotationId: id } });
      data.lineItems = {
        create: input.lineItems.map((item) => ({
          serviceCategoryId: item.serviceCategoryId,
          serviceId: item.serviceId,
          category: item.category,
          itemName: item.itemName,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          subtotal: round2(item.quantity * item.unitPrice),
        })),
      };
    }
  }

  const quotation = await prisma.quotation.update({ where: { id }, data, include: { lineItems: true } });
  await recordAudit({ actorId: actor.id, action: 'UPDATE', entityType: 'Quotation', entityId: id, before, after: quotation });
  return quotation;
}

export async function deleteQuotation(actor: AuthUser, id: string) {
  const quotation = await getQuotationById(id);
  if (quotation.status !== QuotationStatus.DRAFT) {
    throw HttpError.conflict('Only a Draft Quotation can be deleted — cancel it instead');
  }
  await prisma.quotation.delete({ where: { id } });
  await recordAudit({ actorId: actor.id, action: 'DELETE', entityType: 'Quotation', entityId: id, before: quotation });
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

  if (quotation.customer.userId) {
    await notify({
      userId: quotation.customer.userId,
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

/** Manual expire (a Sent Quotation past its validUntil date), reachable via PATCH /:id/status. */
async function expireQuotation(actor: AuthUser, id: string) {
  const quotation = await getQuotationById(id);
  if (quotation.status !== QuotationStatus.SENT) {
    throw HttpError.badRequest('Only a Sent Quotation can be marked Expired');
  }
  const updated = await prisma.quotation.update({ where: { id }, data: { status: QuotationStatus.EXPIRED } });
  await prisma.quotationAuditLog.create({ data: { quotationId: id, action: 'EXPIRED', actorId: actor.id } });
  await recordAudit({ actorId: actor.id, action: 'EXPIRE', entityType: 'Quotation', entityId: id, before: quotation, after: updated });
  return updated;
}

/** Staff withdrawal — allowed only from DRAFT or SENT (not from any terminal state). */
async function cancelQuotation(actor: AuthUser, id: string) {
  const quotation = await getQuotationById(id);
  if (quotation.status !== QuotationStatus.DRAFT && quotation.status !== QuotationStatus.SENT) {
    throw HttpError.badRequest(`A Quotation in ${quotation.status} status cannot be cancelled`);
  }
  const updated = await prisma.quotation.update({ where: { id }, data: { status: QuotationStatus.CANCELLED } });
  await prisma.quotationAuditLog.create({ data: { quotationId: id, action: 'CANCELLED', actorId: actor.id } });
  await recordAudit({ actorId: actor.id, action: 'CANCEL', entityType: 'Quotation', entityId: id, before: quotation, after: updated });
  return updated;
}

const VALID_STATUS_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  DRAFT: [QuotationStatus.SENT, QuotationStatus.CANCELLED],
  SENT: [QuotationStatus.APPROVED, QuotationStatus.REJECTED, QuotationStatus.EXPIRED, QuotationStatus.CANCELLED],
  APPROVED: [],
  REJECTED: [],
  EXPIRED: [],
  CANCELLED: [],
  REVISED: [],
};

/** Staff-driven status change (Section 2, PATCH /:id/status) — validates the transition table before delegating. */
export async function updateQuotationStatus(actor: AuthUser, id: string, status: QuotationStatus) {
  const quotation = await getQuotationById(id);
  const allowed = VALID_STATUS_TRANSITIONS[quotation.status] ?? [];
  if (!allowed.includes(status)) {
    throw HttpError.badRequest(`Cannot transition a Quotation from ${quotation.status} to ${status}`);
  }

  if (status === QuotationStatus.SENT) return sendQuotation(actor, id);
  if (status === QuotationStatus.APPROVED) return respondToQuotation(actor, id, 'APPROVED');
  if (status === QuotationStatus.REJECTED) return respondToQuotation(actor, id, 'REJECTED');
  if (status === QuotationStatus.EXPIRED) return expireQuotation(actor, id);
  if (status === QuotationStatus.CANCELLED) return cancelQuotation(actor, id);
  throw HttpError.badRequest('Unsupported status transition');
}

/** FR-QUOTE-07: Customer (or staff on their behalf) approves/rejects; records a QuotationApproval and locks the record. */
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
    await tx.quotationApproval.create({
      data: {
        quotationId: id,
        customerId: quotation.customerId,
        action: decision === 'APPROVED' ? QuotationApprovalAction.APPROVED : QuotationApprovalAction.REJECTED,
        comments: comment,
      },
    });
    return result;
  });

  const notificationType = decision === 'APPROVED' ? NotificationType.QUOTATION_APPROVED : NotificationType.QUOTATION_REJECTED;
  if (quotation.createdById) {
    await notify({
      userId: quotation.createdById,
      type: notificationType,
      title: `Quotation ${decision === 'APPROVED' ? 'approved' : 'rejected'} by customer`,
      body: `${quotation.quotationNo}`,
      entityType: 'Quotation',
      entityId: id,
    });
  }

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

// ── PDF & Email ──────────────────────────────────────────────────────────────

export async function getQuotationPdfBuffer(id: string) {
  const quotation = await prisma.quotation.findUnique({ where: { id }, select: QUOTATION_PDF_SELECT });
  if (!quotation) throw HttpError.notFound('Quotation not found');
  return { quotation, pdf: await generateQuotationPdf(quotation) };
}

export async function emailQuotation(actor: AuthUser, id: string) {
  const { quotation, pdf } = await getQuotationPdfBuffer(id);
  if (!quotation.customer.email) {
    throw HttpError.badRequest('This customer has no email address on file');
  }

  const html = `
    <p>Dear ${quotation.customer.fullName},</p>
    <p>Please find attached Quotation <strong>${quotation.quotationNo}</strong> for your review.</p>
    <p><strong>Project:</strong> ${quotation.serviceRequest.service?.serviceName ?? quotation.serviceRequest.serviceCategory.name}<br/>
    <strong>Total Amount:</strong> ${quotation.total}</p>
    <p>Please review the attached document and approve or reject it from your customer portal.</p>
  `;

  try {
    await sendMail({
      to: quotation.customer.email,
      subject: `Quotation ${quotation.quotationNo} from your service provider`,
      html,
      attachments: [{ filename: `${quotation.quotationNo}.pdf`, content: pdf, contentType: 'application/pdf' }],
    });
    const updated = await prisma.quotation.update({ where: { id }, data: { emailSentAt: new Date(), emailStatus: 'SENT' } });
    await prisma.quotationAuditLog.create({ data: { quotationId: id, action: 'EMAILED', actorId: actor.id } });
    return updated;
  } catch (err) {
    await prisma.quotation.update({ where: { id }, data: { emailStatus: 'FAILED' } });
    throw err;
  }
}

// ── Statistics (Section 7 — Dashboard Integration) ───────────────────────────

export async function getQuotationStatistics() {
  // byStatus's groupBy already carries the DRAFT/SENT/APPROVED/REJECTED counts, so the
  // total and per-status figures below are derived from it instead of five separate COUNTs.
  const [revenueAgg, byStatus, monthlyRaw] = await Promise.all([
    prisma.quotation.aggregate({ _sum: { total: true }, where: { status: QuotationStatus.APPROVED } }),
    prisma.quotation.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.$queryRaw<{ month: string; value: number }[]>`
      SELECT to_char("createdAt", 'YYYY-MM') AS month, COALESCE(SUM(total), 0)::float AS value
      FROM "Quotation"
      WHERE "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month ASC
    `,
  ]);

  const statusCounts = Object.fromEntries(byStatus.map((row) => [row.status, row._count._all]));
  const total = byStatus.reduce((sum, row) => sum + row._count._all, 0);
  const draft = statusCounts[QuotationStatus.DRAFT] ?? 0;
  const sent = statusCounts[QuotationStatus.SENT] ?? 0;
  const approved = statusCounts[QuotationStatus.APPROVED] ?? 0;
  const rejected = statusCounts[QuotationStatus.REJECTED] ?? 0;

  const respondedCount = approved + rejected;
  const approvalRatePercent = respondedCount > 0 ? round2((approved / respondedCount) * 100) : null;

  return {
    totalQuotations: total,
    draftQuotations: draft,
    sentQuotations: sent,
    approvedQuotations: approved,
    rejectedQuotations: rejected,
    totalRevenueValue: Number(revenueAgg._sum.total ?? 0),
    approvalRatePercent,
    byStatus: byStatus.map((row) => ({ status: row.status, count: row._count._all })),
    monthlyValue: monthlyRaw.map((row) => ({ month: row.month, value: Number(row.value) })),
  };
}

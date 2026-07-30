import { Prisma, CustomerStatus, CustomerType, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { recordAudit } from '@/utils/audit';
import { AuthUser } from '@/middleware/auth';
import { createSignedUploadUrl, deleteObject, pathFromPublicUrl } from '@/lib/storage';
import { ACTIVE_PROJECT_STATUSES, COMPLETED_PROJECT_STATUSES, CANCELLED_PROJECT_STATUSES } from '@/config/project-status-groups';

export function buildCustomerCode(sequenceNo: number) {
  return `CUS-${String(sequenceNo).padStart(6, '0')}`;
}

/** Resolves a "CUS-000123" style search term back to its numeric sequence, for exact-code search. */
function sequenceFromCode(term: string): number | undefined {
  const match = term.trim().match(/^CUS-?0*(\d+)$/i);
  return match ? Number(match[1]) : undefined;
}

interface AddressInput {
  label: string;
  addressLine: string;
  country?: string;
  region?: string;
  city?: string;
  district?: string;
  street?: string;
  building?: string;
  postalCode?: string;
  landmark?: string;
  mapLocation?: string;
  isDefault?: boolean;
  notes?: string;
}

interface ContactInput {
  name: string;
  position?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

interface CreateCustomerInput {
  type?: CustomerType;
  fullName: string;
  companyName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  nationalId?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: Date;
  preferredContactMethod?: 'PHONE' | 'EMAIL' | 'SMS' | 'WHATSAPP';
  source?: string;
  billingAddress?: string;
  status?: CustomerStatus;
  tags?: string[];
  assignedTechnicianId?: string;
  siteAddresses?: AddressInput[];
  contacts?: ContactInput[];
}

async function assertTechnicianExists(userId: string | null | undefined) {
  if (!userId) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) throw HttpError.badRequest('assignedTechnicianId does not reference an existing user');
  if (user.role !== Role.TECHNICIAN && user.role !== Role.SUPERVISOR) {
    throw HttpError.badRequest('assignedTechnicianId must reference a Technician or Supervisor');
  }
}

export async function createCustomer(actor: AuthUser | undefined, input: CreateCustomerInput, allowDuplicate = false) {
  if (!allowDuplicate) {
    const duplicate = await prisma.customer.findFirst({
      where: {
        deletedAt: null,
        OR: [{ phone: input.phone }, ...(input.email ? [{ email: input.email }] : [])],
      },
    });
    if (duplicate) {
      throw HttpError.conflict('A customer with this phone number or email already exists', {
        existingCustomerId: duplicate.id,
        existingCustomerName: duplicate.fullName,
      });
    }
  }

  await assertTechnicianExists(input.assignedTechnicianId);

  const addresses = input.siteAddresses ?? [];
  if (addresses.filter((a) => a.isDefault).length > 1) {
    throw HttpError.badRequest('Only one address may be marked as default');
  }
  // If none explicitly marked, the first address (if any) becomes the default.
  const normalizedAddresses = addresses.map((a, i) => ({ ...a, isDefault: a.isDefault ?? (i === 0 && addresses.length > 0) }));

  const contacts = input.contacts ?? [];
  const normalizedContacts = contacts.map((c, i) => ({ ...c, isPrimary: c.isPrimary ?? (i === 0 && contacts.length > 0) }));

  const customer = await prisma.$transaction(async (tx) => {
    const created = await tx.customer.create({
      data: {
        customerCode: 'PENDING',
        type: input.type,
        fullName: input.fullName,
        companyName: input.companyName,
        email: input.email,
        phone: input.phone,
        alternatePhone: input.alternatePhone,
        nationalId: input.nationalId,
        gender: input.gender,
        dateOfBirth: input.dateOfBirth,
        preferredContactMethod: input.preferredContactMethod,
        source: input.source as never,
        billingAddress: input.billingAddress,
        status: input.status,
        tags: input.tags ?? [],
        assignedTechnicianId: input.assignedTechnicianId,
        createdById: actor?.id,
        siteAddresses: normalizedAddresses.length ? { create: normalizedAddresses } : undefined,
        contacts: normalizedContacts.length ? { create: normalizedContacts } : undefined,
      },
    });
    return tx.customer.update({
      where: { id: created.id },
      data: { customerCode: buildCustomerCode(created.sequenceNo) },
      include: { siteAddresses: true, contacts: true },
    });
  });

  await recordAudit({ actorId: actor?.id, action: 'CREATE', entityType: 'Customer', entityId: customer.id, after: customer });
  return customer;
}

interface ListCustomersFilters {
  search?: string;
  type?: CustomerType;
  status?: CustomerStatus;
  city?: string;
  source?: string;
  assignedTechnicianId?: string;
  registeredFrom?: Date;
  registeredTo?: Date;
  hasActiveProjects?: boolean;
  hasCompletedProjects?: boolean;
  minOutstandingBalance?: number;
  includeDeleted?: boolean;
  sort: 'newest' | 'oldest' | 'alphabetical' | 'most_projects' | 'highest_revenue';
  page: number;
  pageSize: number;
}

async function buildListWhere(filters: ListCustomersFilters): Promise<Prisma.CustomerWhereInput> {
  const codeFromSearch = filters.search ? sequenceFromCode(filters.search) : undefined;

  const where: Prisma.CustomerWhereInput = {
    deletedAt: filters.includeDeleted ? undefined : null,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.source ? { source: filters.source as never } : {}),
    ...(filters.city ? { siteAddresses: { some: { city: { contains: filters.city, mode: 'insensitive' } } } } : {}),
    ...(filters.assignedTechnicianId ? { assignedTechnicianId: filters.assignedTechnicianId } : {}),
    ...(filters.registeredFrom || filters.registeredTo
      ? { createdAt: { gte: filters.registeredFrom, lte: filters.registeredTo } }
      : {}),
    ...(filters.hasActiveProjects ? { projects: { some: { status: { in: ACTIVE_PROJECT_STATUSES } } } } : {}),
    ...(filters.hasCompletedProjects ? { projects: { some: { status: { in: COMPLETED_PROJECT_STATUSES } } } } : {}),
    ...(filters.search
      ? {
          OR: [
            { fullName: { contains: filters.search, mode: 'insensitive' } },
            { phone: { contains: filters.search } },
            { alternatePhone: { contains: filters.search } },
            { email: { contains: filters.search, mode: 'insensitive' } },
            { companyName: { contains: filters.search, mode: 'insensitive' } },
            ...(codeFromSearch !== undefined ? [{ sequenceNo: codeFromSearch }] : []),
          ],
        }
      : {}),
  };

  if (filters.minOutstandingBalance !== undefined) {
    const grouped = await prisma.invoice.groupBy({
      by: ['customerId'],
      _sum: { balance: true },
      having: { balance: { _sum: { gte: filters.minOutstandingBalance } } },
    });
    const ids = grouped.map((g) => g.customerId);
    where.id = { in: ids };
  }

  return where;
}

export async function listCustomers(filters: ListCustomersFilters) {
  const where = await buildListWhere(filters);

  if (filters.sort === 'highest_revenue') {
    // Prisma can't ORDER BY an aggregate sum across a relation, so this sort is
    // computed via a two-step aggregate-then-fetch instead of a single findMany.
    const matchingIds = (await prisma.customer.findMany({ where, select: { id: true } })).map((c) => c.id);
    const total = matchingIds.length;
    const grouped = await prisma.payment.groupBy({
      by: ['customerId'],
      where: { customerId: { in: matchingIds }, reversedAt: null },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    });
    const orderedIds = grouped.map((g) => g.customerId);
    const zeroRevenueIds = matchingIds.filter((id) => !orderedIds.includes(id));
    const pageIds = [...orderedIds, ...zeroRevenueIds].slice(0, filters.pageSize);
    const rows = await prisma.customer.findMany({ where: { id: { in: pageIds } }, include: { siteAddresses: true } });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const items = pageIds.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r));
    return { items, total, page: filters.page, pageSize: filters.pageSize };
  }

  const orderBy: Prisma.CustomerOrderByWithRelationInput =
    filters.sort === 'oldest'
      ? { createdAt: 'asc' }
      : filters.sort === 'alphabetical'
        ? { fullName: 'asc' }
        : filters.sort === 'most_projects'
          ? { projects: { _count: 'desc' } }
          : { createdAt: 'desc' };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      include: { siteAddresses: true },
    }),
    prisma.customer.count({ where }),
  ]);

  return { items, total, page: filters.page, pageSize: filters.pageSize };
}

export async function getCustomerById(id: string, options: { includeDeleted?: boolean } = {}) {
  const customer = await prisma.customer.findFirst({
    where: { id, ...(options.includeDeleted ? {} : { deletedAt: null }) },
    include: {
      siteAddresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] },
      contacts: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
      notes: { orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }], include: { author: { select: { id: true, fullName: true } } } },
      documents: { orderBy: { createdAt: 'desc' }, include: { uploadedBy: { select: { id: true, fullName: true } } } },
      serviceRequests: { orderBy: { createdAt: 'desc' }, take: 50 },
      quotations: { orderBy: { createdAt: 'desc' }, take: 50 },
      projects: { orderBy: { createdAt: 'desc' } },
      invoices: { orderBy: { createdAt: 'desc' } },
      payments: { orderBy: { paidAt: 'desc' } },
      assignedTechnician: { select: { id: true, fullName: true, email: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
  });
  if (!customer) throw HttpError.notFound('Customer not found');

  const outstandingBalance = customer.invoices.reduce((sum, inv) => sum + Number(inv.balance), 0);
  const totalInvoiced = customer.invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const totalPaid = customer.payments.filter((p) => !p.reversedAt).reduce((sum, p) => sum + Number(p.amount), 0);

  let runningBalance = 0;
  const paymentTimeline = [...customer.payments]
    .filter((p) => !p.reversedAt)
    .sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime())
    .map((p) => {
      runningBalance += Number(p.amount);
      return { ...p, runningBalance };
    })
    .reverse();

  const projectsCurrent = customer.projects.filter((p) => ACTIVE_PROJECT_STATUSES.includes(p.status));
  const projectsCompleted = customer.projects.filter((p) => COMPLETED_PROJECT_STATUSES.includes(p.status));
  const projectsCancelled = customer.projects.filter((p) => CANCELLED_PROJECT_STATUSES.includes(p.status));

  const timeline = await buildCustomerTimeline(customer);

  return {
    ...customer,
    paymentTimeline,
    stats: {
      outstandingBalance,
      totalInvoiced,
      totalPaid,
      overdueInvoiceCount: customer.invoices.filter((i) => i.status === 'OVERDUE').length,
      projectsCurrentCount: projectsCurrent.length,
      projectsCompletedCount: projectsCompleted.length,
      projectsCancelledCount: projectsCancelled.length,
    },
    projectsCurrent,
    projectsCompleted,
    projectsCancelled,
    timeline,
  };
}

type CustomerWithRelations = Prisma.CustomerGetPayload<{
  include: {
    siteAddresses: true;
    contacts: true;
    notes: true;
    documents: true;
    serviceRequests: true;
    quotations: true;
    projects: true;
    invoices: true;
    payments: true;
  };
}>;

interface TimelineEvent {
  type: string;
  message: string;
  at: Date;
  actorId?: string | null;
}

async function buildCustomerTimeline(customer: CustomerWithRelations): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [
    { type: 'CUSTOMER_REGISTERED', message: `Customer registered as ${customer.customerCode}`, at: customer.createdAt },
  ];

  for (const address of customer.siteAddresses) {
    events.push({ type: 'ADDRESS_ADDED', message: `Address added: ${address.label}`, at: address.createdAt });
  }
  for (const request of customer.serviceRequests) {
    events.push({ type: 'SERVICE_REQUEST_CREATED', message: `Service request created (${request.status})`, at: request.createdAt });
  }
  for (const quotation of customer.quotations) {
    events.push({ type: 'QUOTATION_CREATED', message: `Quotation ${quotation.quotationNo} created`, at: quotation.createdAt });
  }
  for (const project of customer.projects) {
    events.push({ type: 'PROJECT_CREATED', message: `Project ${project.projectNo} created`, at: project.createdAt });
  }
  for (const invoice of customer.invoices) {
    events.push({ type: 'INVOICE_GENERATED', message: `Invoice ${invoice.invoiceNo} generated`, at: invoice.createdAt });
  }
  for (const payment of customer.payments.filter((p) => !p.reversedAt)) {
    events.push({ type: 'PAYMENT_RECEIVED', message: `Payment of ${payment.amount} received`, at: payment.paidAt });
  }
  for (const document of customer.documents) {
    events.push({ type: 'DOCUMENT_UPLOADED', message: `Document uploaded: ${document.fileName}`, at: document.createdAt });
  }
  for (const note of customer.notes) {
    events.push({ type: 'NOTE_ADDED', message: 'Note added', at: note.createdAt, actorId: note.authorId });
  }

  const profileUpdates = await prisma.auditLog.findMany({
    where: { entityType: 'Customer', entityId: customer.id, action: { in: ['UPDATE', 'DEACTIVATE', 'DELETE', 'RESTORE'] } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  for (const log of profileUpdates) {
    events.push({ type: `PROFILE_${log.action}`, message: `Profile ${log.action.toLowerCase()}d`, at: log.createdAt, actorId: log.actorId });
  }

  if (customer.userId) {
    const logins = await prisma.refreshToken.findMany({
      where: { userId: customer.userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { createdAt: true },
    });
    for (const login of logins) {
      events.push({ type: 'LOGIN_ACTIVITY', message: 'Customer portal login', at: login.createdAt });
    }
  }

  return events.sort((a, b) => b.at.getTime() - a.at.getTime());
}

export async function updateCustomer(
  actor: AuthUser | undefined,
  id: string,
  input: Partial<CreateCustomerInput> & { status?: CustomerStatus },
) {
  const before = await getCustomerById(id);
  await assertTechnicianExists(input.assignedTechnicianId);
  const { siteAddresses: _siteAddresses, contacts: _contacts, ...data } = input;
  const customer = await prisma.customer.update({ where: { id }, data: data as Prisma.CustomerUpdateInput });
  await recordAudit({ actorId: actor?.id, action: 'UPDATE', entityType: 'Customer', entityId: id, before, after: customer });
  return customer;
}

/** BR-CUST-01: a Customer with any linked business record may only be deactivated, never hard-deleted. */
export async function deactivateCustomer(actor: AuthUser, id: string) {
  await getCustomerById(id);
  const customer = await prisma.customer.update({ where: { id }, data: { status: CustomerStatus.INACTIVE } });
  await recordAudit({ actorId: actor.id, action: 'DEACTIVATE', entityType: 'Customer', entityId: id });
  return customer;
}

export async function softDeleteCustomer(actor: AuthUser, id: string) {
  await getCustomerById(id);
  const customer = await prisma.customer.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: actor.id },
  });
  await recordAudit({ actorId: actor.id, action: 'DELETE', entityType: 'Customer', entityId: id });
  return customer;
}

export async function restoreCustomer(actor: AuthUser, id: string) {
  await getCustomerById(id, { includeDeleted: true });
  const customer = await prisma.customer.update({
    where: { id },
    data: { deletedAt: null, deletedById: null },
  });
  await recordAudit({ actorId: actor.id, action: 'RESTORE', entityType: 'Customer', entityId: id });
  return customer;
}

export async function bulkSoftDelete(actor: AuthUser, ids: string[]) {
  const result = await prisma.customer.updateMany({
    where: { id: { in: ids }, deletedAt: null },
    data: { deletedAt: new Date(), deletedById: actor.id },
  });
  await recordAudit({ actorId: actor.id, action: 'BULK_DELETE', entityType: 'Customer', entityId: ids.join(',') });
  return { updated: result.count };
}

export async function bulkRestore(actor: AuthUser, ids: string[]) {
  const result = await prisma.customer.updateMany({
    where: { id: { in: ids }, deletedAt: { not: null } },
    data: { deletedAt: null, deletedById: null },
  });
  await recordAudit({ actorId: actor.id, action: 'BULK_RESTORE', entityType: 'Customer', entityId: ids.join(',') });
  return { updated: result.count };
}

export async function bulkUpdateStatus(actor: AuthUser, ids: string[], status: CustomerStatus) {
  const result = await prisma.customer.updateMany({
    where: { id: { in: ids }, deletedAt: null },
    data: { status },
  });
  await recordAudit({ actorId: actor.id, action: 'BULK_STATUS_UPDATE', entityType: 'Customer', entityId: ids.join(','), after: { status } });
  return { updated: result.count };
}

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export async function exportCustomersCsv(filters: Omit<ListCustomersFilters, 'page' | 'pageSize'>) {
  const where = await buildListWhere({ ...filters, page: 1, pageSize: 1 });
  const customers = await prisma.customer.findMany({ where, orderBy: { createdAt: 'desc' } });

  const headers = ['Customer Code', 'Full Name', 'Company', 'Type', 'Status', 'Phone', 'Email', 'City', 'Registered At'];
  const rows = customers.map((c) => [c.customerCode, c.fullName, c.companyName, c.type, c.status, c.phone, c.email, '', c.createdAt.toISOString()]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  return csv;
}

// ── Site Addresses ─────────────────────────────────────────────────────────

export async function addSiteAddress(actor: AuthUser | undefined, customerId: string, input: AddressInput) {
  await getCustomerById(customerId);
  const address = await prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.customerSiteAddress.updateMany({ where: { customerId }, data: { isDefault: false } });
    }
    return tx.customerSiteAddress.create({ data: { customerId, ...input } });
  });
  await recordAudit({ actorId: actor?.id, action: 'CREATE', entityType: 'CustomerSiteAddress', entityId: address.id });
  return address;
}

export async function updateSiteAddress(actor: AuthUser | undefined, customerId: string, addressId: string, input: Partial<AddressInput>) {
  const existing = await prisma.customerSiteAddress.findFirst({ where: { id: addressId, customerId } });
  if (!existing) throw HttpError.notFound('Address not found');
  const address = await prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.customerSiteAddress.updateMany({ where: { customerId, id: { not: addressId } }, data: { isDefault: false } });
    }
    return tx.customerSiteAddress.update({ where: { id: addressId }, data: input });
  });
  await recordAudit({ actorId: actor?.id, action: 'UPDATE', entityType: 'CustomerSiteAddress', entityId: addressId, before: existing, after: address });
  return address;
}

export async function deleteSiteAddress(actor: AuthUser | undefined, customerId: string, addressId: string) {
  const existing = await prisma.customerSiteAddress.findFirst({ where: { id: addressId, customerId } });
  if (!existing) throw HttpError.notFound('Address not found');
  await prisma.customerSiteAddress.delete({ where: { id: addressId } });
  await recordAudit({ actorId: actor?.id, action: 'DELETE', entityType: 'CustomerSiteAddress', entityId: addressId, before: existing });
}

// ── Contacts ────────────────────────────────────────────────────────────────

export async function addContact(actor: AuthUser | undefined, customerId: string, input: ContactInput) {
  await getCustomerById(customerId);
  const contact = await prisma.$transaction(async (tx) => {
    if (input.isPrimary) {
      await tx.customerContact.updateMany({ where: { customerId }, data: { isPrimary: false } });
    }
    return tx.customerContact.create({ data: { customerId, ...input } });
  });
  await recordAudit({ actorId: actor?.id, action: 'CREATE', entityType: 'CustomerContact', entityId: contact.id });
  return contact;
}

export async function updateContact(actor: AuthUser | undefined, customerId: string, contactId: string, input: Partial<ContactInput>) {
  const existing = await prisma.customerContact.findFirst({ where: { id: contactId, customerId } });
  if (!existing) throw HttpError.notFound('Contact not found');
  const contact = await prisma.$transaction(async (tx) => {
    if (input.isPrimary) {
      await tx.customerContact.updateMany({ where: { customerId, id: { not: contactId } }, data: { isPrimary: false } });
    }
    return tx.customerContact.update({ where: { id: contactId }, data: input });
  });
  await recordAudit({ actorId: actor?.id, action: 'UPDATE', entityType: 'CustomerContact', entityId: contactId, before: existing, after: contact });
  return contact;
}

export async function deleteContact(actor: AuthUser | undefined, customerId: string, contactId: string) {
  const existing = await prisma.customerContact.findFirst({ where: { id: contactId, customerId } });
  if (!existing) throw HttpError.notFound('Contact not found');
  await prisma.customerContact.delete({ where: { id: contactId } });
  await recordAudit({ actorId: actor?.id, action: 'DELETE', entityType: 'CustomerContact', entityId: contactId, before: existing });
}

// ── Notes ───────────────────────────────────────────────────────────────────

export async function addNote(
  actor: AuthUser | undefined,
  customerId: string,
  input: { note: string; visibility?: 'INTERNAL' | 'PUBLIC'; isPinned?: boolean; attachments?: string[] },
) {
  await getCustomerById(customerId);
  const note = await prisma.customerNote.create({
    data: { customerId, authorId: actor?.id, note: input.note, visibility: input.visibility, isPinned: input.isPinned, attachments: input.attachments ?? [] },
  });
  await recordAudit({ actorId: actor?.id, action: 'CREATE', entityType: 'CustomerNote', entityId: note.id });
  return note;
}

export async function updateNote(
  actor: AuthUser | undefined,
  customerId: string,
  noteId: string,
  input: { note?: string; visibility?: 'INTERNAL' | 'PUBLIC'; isPinned?: boolean; attachments?: string[] },
) {
  const existing = await prisma.customerNote.findFirst({ where: { id: noteId, customerId } });
  if (!existing) throw HttpError.notFound('Note not found');
  const note = await prisma.customerNote.update({ where: { id: noteId }, data: input });
  await recordAudit({ actorId: actor?.id, action: 'UPDATE', entityType: 'CustomerNote', entityId: noteId, before: existing, after: note });
  return note;
}

export async function deleteNote(actor: AuthUser | undefined, customerId: string, noteId: string) {
  const existing = await prisma.customerNote.findFirst({ where: { id: noteId, customerId } });
  if (!existing) throw HttpError.notFound('Note not found');
  await prisma.customerNote.delete({ where: { id: noteId } });
  await recordAudit({ actorId: actor?.id, action: 'DELETE', entityType: 'CustomerNote', entityId: noteId, before: existing });
}

// ── Documents ───────────────────────────────────────────────────────────────

export async function requestDocumentUploadUrl(customerId: string, fileName: string) {
  await getCustomerById(customerId);
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `customers/${customerId}/${Date.now()}-${safeName}`;
  return createSignedUploadUrl(path);
}

export async function addDocument(
  actor: AuthUser | undefined,
  customerId: string,
  input: { category?: string; fileName: string; fileUrl: string; fileSize?: number; mimeType?: string; replacesId?: string },
) {
  await getCustomerById(customerId);
  let version = 1;
  if (input.replacesId) {
    const previous = await prisma.customerDocument.findFirst({ where: { id: input.replacesId, customerId } });
    if (!previous) throw HttpError.notFound('Document being replaced was not found');
    version = previous.version + 1;
  }
  const document = await prisma.customerDocument.create({
    data: {
      customerId,
      category: input.category as never,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      version,
      replacesId: input.replacesId,
      uploadedById: actor?.id,
    },
  });
  await recordAudit({ actorId: actor?.id, action: 'CREATE', entityType: 'CustomerDocument', entityId: document.id });
  return document;
}

export async function renameDocument(actor: AuthUser | undefined, customerId: string, documentId: string, fileName: string) {
  const existing = await prisma.customerDocument.findFirst({ where: { id: documentId, customerId } });
  if (!existing) throw HttpError.notFound('Document not found');
  const document = await prisma.customerDocument.update({ where: { id: documentId }, data: { fileName } });
  await recordAudit({ actorId: actor?.id, action: 'UPDATE', entityType: 'CustomerDocument', entityId: documentId, before: existing, after: document });
  return document;
}

export async function deleteDocument(actor: AuthUser | undefined, customerId: string, documentId: string) {
  const existing = await prisma.customerDocument.findFirst({ where: { id: documentId, customerId } });
  if (!existing) throw HttpError.notFound('Document not found');
  await prisma.customerDocument.delete({ where: { id: documentId } });
  const path = pathFromPublicUrl(existing.fileUrl);
  if (path) {
    await deleteObject(path).catch(() => undefined);
  }
  await recordAudit({ actorId: actor?.id, action: 'DELETE', entityType: 'CustomerDocument', entityId: documentId, before: existing });
}

export async function getDocumentVersionHistory(customerId: string, documentId: string) {
  const chain = [];
  let currentId: string | null = documentId;
  while (currentId) {
    const doc: { id: string; fileName: string; version: number; createdAt: Date; replacesId: string | null } | null =
      await prisma.customerDocument.findFirst({
        where: { id: currentId, customerId },
        select: { id: true, fileName: true, version: true, createdAt: true, replacesId: true },
      });
    if (!doc) break;
    chain.push(doc);
    currentId = doc.replacesId;
  }
  return chain;
}

// ── Statistics ──────────────────────────────────────────────────────────────

let statsCache: { data: unknown; expiresAt: number } | null = null;
const STATS_CACHE_TTL_MS = 60_000;

export async function getCustomerStatistics() {
  if (statsCache && statsCache.expiresAt > Date.now()) return statsCache.data;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [
    totalCustomers,
    activeCustomers,
    inactiveCustomers,
    blockedCustomers,
    businessCustomers,
    individualCustomers,
    newCustomersThisMonth,
    customersWithActiveProjects,
    outstandingGroups,
    topSpenders,
    monthlyRows,
  ] = await Promise.all([
    prisma.customer.count({ where: { deletedAt: null } }),
    prisma.customer.count({ where: { deletedAt: null, status: CustomerStatus.ACTIVE } }),
    prisma.customer.count({ where: { deletedAt: null, status: CustomerStatus.INACTIVE } }),
    prisma.customer.count({ where: { deletedAt: null, status: CustomerStatus.BLOCKED } }),
    prisma.customer.count({ where: { deletedAt: null, type: CustomerType.CORPORATE } }),
    prisma.customer.count({ where: { deletedAt: null, type: CustomerType.INDIVIDUAL } }),
    prisma.customer.count({ where: { deletedAt: null, createdAt: { gte: startOfMonth } } }),
    prisma.customer.count({ where: { deletedAt: null, projects: { some: { status: { in: ACTIVE_PROJECT_STATUSES } } } } }),
    prisma.invoice.groupBy({ by: ['customerId'], _sum: { balance: true }, having: { balance: { _sum: { gt: 0 } } } }),
    prisma.payment.groupBy({
      by: ['customerId'],
      where: { reversedAt: null },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    }),
    prisma.$queryRaw<{ month: Date; count: bigint }[]>`
      SELECT date_trunc('month', "createdAt") AS month, COUNT(*)::bigint AS count
      FROM "Customer"
      WHERE "deletedAt" IS NULL AND "createdAt" >= ${twelveMonthsAgo}
      GROUP BY month
      ORDER BY month ASC
    `,
  ]);

  const topCustomerIds = topSpenders.map((s) => s.customerId);
  const topCustomerRecords = topCustomerIds.length
    ? await prisma.customer.findMany({ where: { id: { in: topCustomerIds } }, select: { id: true, fullName: true, companyName: true, customerCode: true } })
    : [];
  const topCustomerById = new Map(topCustomerRecords.map((c) => [c.id, c]));

  const data = {
    totalCustomers,
    activeCustomers,
    inactiveCustomers,
    blockedCustomers,
    businessCustomers,
    individualCustomers,
    newCustomersThisMonth,
    customersWithActiveProjects,
    customersWithOutstandingPayments: outstandingGroups.length,
    topCustomers: topSpenders.map((s) => ({
      customerId: s.customerId,
      fullName: topCustomerById.get(s.customerId)?.fullName ?? 'Unknown',
      companyName: topCustomerById.get(s.customerId)?.companyName ?? null,
      customerCode: topCustomerById.get(s.customerId)?.customerCode ?? null,
      totalPaid: Number(s._sum.amount ?? 0),
    })),
    monthlyRegistrations: monthlyRows.map((r) => ({ month: r.month.toISOString().slice(0, 7), count: Number(r.count) })),
  };

  statsCache = { data, expiresAt: Date.now() + STATS_CACHE_TTL_MS };
  return data;
}

/** Resolves the Customer record owned by a logged-in CUSTOMER-role user (FR-CUST-08). */
export async function getCustomerByUserId(userId: string) {
  const customer = await prisma.customer.findUnique({ where: { userId } });
  if (!customer) throw HttpError.notFound('Customer profile not found for this account');
  return customer;
}

import { CustomerStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { recordAudit } from '@/utils/audit';
import { AuthUser } from '@/middleware/auth';

interface CreateCustomerInput {
  type?: 'INDIVIDUAL' | 'CORPORATE';
  fullName: string;
  companyName?: string;
  email?: string;
  phone: string;
  billingAddress?: string;
  tags?: string[];
  siteAddresses?: { label: string; addressLine: string; city?: string }[];
}

export async function createCustomer(actor: AuthUser | undefined, input: CreateCustomerInput, allowDuplicate = false) {
  // FR-CUST-04 / BR-CUST-02: warn on likely duplicate (matching phone or email) among active customers.
  if (!allowDuplicate) {
    const duplicate = await prisma.customer.findFirst({
      where: {
        status: CustomerStatus.ACTIVE,
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

  const customer = await prisma.customer.create({
    data: {
      type: input.type,
      fullName: input.fullName,
      companyName: input.companyName,
      email: input.email,
      phone: input.phone,
      billingAddress: input.billingAddress,
      tags: input.tags ?? [],
      createdById: actor?.id,
      siteAddresses: input.siteAddresses ? { create: input.siteAddresses } : undefined,
    },
    include: { siteAddresses: true },
  });

  await recordAudit({ actorId: actor?.id, action: 'CREATE', entityType: 'Customer', entityId: customer.id, after: customer });
  return customer;
}

export async function listCustomers(filters: { search?: string; status?: CustomerStatus; page: number; pageSize: number }) {
  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { fullName: { contains: filters.search, mode: 'insensitive' as const } },
            { phone: { contains: filters.search } },
            { email: { contains: filters.search, mode: 'insensitive' as const } },
            { companyName: { contains: filters.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      include: { siteAddresses: true },
    }),
    prisma.customer.count({ where }),
  ]);

  return { items, total, page: filters.page, pageSize: filters.pageSize };
}

export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      siteAddresses: true,
      notes: { orderBy: { createdAt: 'desc' } },
      serviceRequests: { orderBy: { createdAt: 'desc' }, take: 20 },
      quotations: { orderBy: { createdAt: 'desc' }, take: 20 },
      projects: { orderBy: { createdAt: 'desc' }, take: 20 },
      invoices: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });
  if (!customer) throw HttpError.notFound('Customer not found');
  return customer;
}

export async function updateCustomer(actor: AuthUser | undefined, id: string, input: Partial<CreateCustomerInput> & { status?: CustomerStatus }) {
  const before = await getCustomerById(id);
  const { siteAddresses: _siteAddresses, ...data } = input;
  const customer = await prisma.customer.update({ where: { id }, data });
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

export async function addSiteAddress(id: string, input: { label: string; addressLine: string; city?: string; notes?: string }) {
  await getCustomerById(id);
  return prisma.customerSiteAddress.create({ data: { customerId: id, ...input } });
}

export async function addNote(actor: AuthUser | undefined, id: string, note: string) {
  await getCustomerById(id);
  return prisma.customerNote.create({ data: { customerId: id, authorId: actor?.id, note } });
}

/** Resolves the Customer record owned by a logged-in CUSTOMER-role user (FR-CUST-08). */
export async function getCustomerByUserId(userId: string) {
  const customer = await prisma.customer.findUnique({ where: { userId } });
  if (!customer) throw HttpError.notFound('Customer profile not found for this account');
  return customer;
}

import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { hashPassword } from '@/utils/password';
import { recordAudit } from '@/utils/audit';
import { AuthUser } from '@/middleware/auth';
import { syncPrimaryUserRole } from '@/modules/rbac/rbac.service';
import { createSignedUploadUrl } from '@/lib/storage';

const SELECT_SAFE = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  employeeId: true,
  department: true,
  jobTitle: true,
  address: true,
  hireDate: true,
  photoUrl: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

const SELECT_DETAIL = {
  ...SELECT_SAFE,
  technicianProfile: { select: { id: true, skills: true, employmentType: true, status: true } },
  employeeDocuments: {
    select: {
      id: true,
      category: true,
      fileName: true,
      fileUrl: true,
      fileSize: true,
      mimeType: true,
      createdAt: true,
      uploadedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
} as const;

interface EmployeeFields {
  phone?: string;
  employeeId?: string;
  department?: string;
  jobTitle?: string;
  address?: string;
  hireDate?: Date;
  photoUrl?: string;
}

/** Shared duplicate-check for email/Employee ID/phone — used by both create and update. */
async function assertNoDuplicates(input: { email?: string; employeeId?: string; phone?: string }, excludeUserId?: string) {
  if (input.email) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing && existing.id !== excludeUserId) throw HttpError.conflict('A user with this email already exists');
  }
  if (input.employeeId) {
    const existing = await prisma.user.findUnique({ where: { employeeId: input.employeeId } });
    if (existing && existing.id !== excludeUserId) throw HttpError.conflict('A user with this Employee ID already exists');
  }
  if (input.phone) {
    const existing = await prisma.user.findFirst({ where: { phone: input.phone } });
    if (existing && existing.id !== excludeUserId) throw HttpError.conflict('A user with this phone number already exists');
  }
}

export async function createUser(
  actor: AuthUser,
  input: EmployeeFields & { fullName: string; email: string; password: string; role: Role },
) {
  // R1/R2: only Super Admin may create another Super Admin.
  if (input.role === Role.SUPER_ADMIN && actor.role !== Role.SUPER_ADMIN) {
    throw HttpError.forbidden('Only a Super Admin can create another Super Admin account');
  }

  await assertNoDuplicates(input);

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      employeeId: input.employeeId,
      department: input.department,
      jobTitle: input.jobTitle,
      address: input.address,
      hireDate: input.hireDate,
      photoUrl: input.photoUrl,
      passwordHash,
      role: input.role,
    },
    select: SELECT_SAFE,
  });

  if (input.role === Role.TECHNICIAN) {
    await prisma.technicianProfile.create({ data: { userId: user.id } });
  }

  await syncPrimaryUserRole(user.id, input.role);
  await recordAudit({ actorId: actor.id, action: 'CREATE', entityType: 'User', entityId: user.id, after: user });
  return user;
}

export async function listUsers(filters: {
  role?: Role;
  status?: string;
  department?: string;
  search?: string;
  sort?: 'newest' | 'oldest' | 'alphabetical';
  page: number;
  pageSize: number;
}) {
  const where = {
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.status ? { status: filters.status as any } : {}),
    ...(filters.department ? { department: filters.department } : {}),
    ...(filters.search
      ? {
          OR: [
            { fullName: { contains: filters.search, mode: 'insensitive' as const } },
            { email: { contains: filters.search, mode: 'insensitive' as const } },
            { employeeId: { contains: filters.search, mode: 'insensitive' as const } },
            { phone: { contains: filters.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const orderBy =
    filters.sort === 'oldest'
      ? { createdAt: 'asc' as const }
      : filters.sort === 'alphabetical'
        ? { fullName: 'asc' as const }
        : { createdAt: 'desc' as const };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: SELECT_SAFE,
      orderBy,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page: filters.page, pageSize: filters.pageSize };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: SELECT_DETAIL });
  if (!user) throw HttpError.notFound('User not found');
  return user;
}

export async function updateUser(actor: AuthUser, id: string, input: EmployeeFields & { fullName?: string; status?: any; role?: Role }) {
  const before = await getUserById(id);

  if (input.role === Role.SUPER_ADMIN && actor.role !== Role.SUPER_ADMIN) {
    throw HttpError.forbidden('Only a Super Admin can promote a user to Super Admin');
  }
  if (before.role === Role.SUPER_ADMIN && actor.role !== Role.SUPER_ADMIN) {
    throw HttpError.forbidden('Only a Super Admin can modify another Super Admin account');
  }
  await assertNoDuplicates(input, id);

  const user = await prisma.user.update({ where: { id }, data: input, select: SELECT_SAFE });
  if (input.role && input.role !== before.role) {
    await syncPrimaryUserRole(id, input.role);
  }
  await recordAudit({ actorId: actor.id, action: 'UPDATE', entityType: 'User', entityId: id, before, after: user });
  return user;
}

export async function updateOwnProfile(actor: AuthUser, input: { fullName?: string; phone?: string }) {
  const before = await getUserById(actor.id);
  await assertNoDuplicates(input, actor.id);
  const user = await prisma.user.update({ where: { id: actor.id }, data: input, select: SELECT_SAFE });
  await recordAudit({ actorId: actor.id, action: 'UPDATE_OWN_PROFILE', entityType: 'User', entityId: actor.id, before, after: user });
  return user;
}

export async function getUserStatistics() {
  const [total, active, inactive, onLeave, byDepartmentRaw] = await Promise.all([
    prisma.user.count({ where: { role: { not: Role.CUSTOMER } } }),
    prisma.user.count({ where: { role: { not: Role.CUSTOMER }, status: 'ACTIVE' } }),
    prisma.user.count({ where: { role: { not: Role.CUSTOMER }, status: 'INACTIVE' } }),
    prisma.user.count({ where: { role: { not: Role.CUSTOMER }, status: 'ON_LEAVE' } }),
    prisma.user.groupBy({
      by: ['department'],
      where: { role: { not: Role.CUSTOMER }, department: { not: null } },
      _count: { _all: true },
    }),
  ]);

  return {
    totalEmployees: total,
    activeEmployees: active,
    inactiveEmployees: inactive,
    onLeaveEmployees: onLeave,
    byDepartment: byDepartmentRaw.map((row) => ({ department: row.department as string, count: row._count._all })),
  };
}

// ── Employee Documents (ID cards, contracts, certificates, resumes, etc.) ──────────

export async function requestEmployeeDocumentUploadUrl(userId: string, fileName: string) {
  await getUserById(userId);
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `employees/${userId}/${Date.now()}-${safeName}`;
  return createSignedUploadUrl(path);
}

export async function addEmployeeDocument(
  actor: AuthUser,
  userId: string,
  input: { category?: string; fileName: string; fileUrl: string; fileSize?: number; mimeType?: string },
) {
  await getUserById(userId);
  const document = await prisma.employeeDocument.create({
    data: {
      userId,
      category: input.category as never,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      uploadedById: actor.id,
    },
  });
  await recordAudit({ actorId: actor.id, action: 'CREATE', entityType: 'EmployeeDocument', entityId: document.id });
  return document;
}

export async function deleteEmployeeDocument(actor: AuthUser, userId: string, documentId: string) {
  const existing = await prisma.employeeDocument.findFirst({ where: { id: documentId, userId } });
  if (!existing) throw HttpError.notFound('Document not found');
  await prisma.employeeDocument.delete({ where: { id: documentId } });
  await recordAudit({ actorId: actor.id, action: 'DELETE', entityType: 'EmployeeDocument', entityId: documentId, before: existing });
}

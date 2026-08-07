import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { hashPassword } from '@/utils/password';
import { recordAudit } from '@/utils/audit';
import { AuthUser } from '@/middleware/auth';
import { syncPrimaryUserRole } from '@/modules/rbac/rbac.service';

const SELECT_SAFE = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  employeeId: true,
  department: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function createUser(
  actor: AuthUser,
  input: { fullName: string; email: string; phone?: string; employeeId?: string; department?: string; password: string; role: Role },
) {
  // R1/R2: only Super Admin may create another Super Admin.
  if (input.role === Role.SUPER_ADMIN && actor.role !== Role.SUPER_ADMIN) {
    throw HttpError.forbidden('Only a Super Admin can create another Super Admin account');
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw HttpError.conflict('A user with this email already exists');

  if (input.employeeId) {
    const duplicateEmployeeId = await prisma.user.findUnique({ where: { employeeId: input.employeeId } });
    if (duplicateEmployeeId) throw HttpError.conflict('A user with this Employee ID already exists');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      employeeId: input.employeeId,
      department: input.department,
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

export async function listUsers(filters: { role?: Role; status?: string; search?: string; page: number; pageSize: number }) {
  const where = {
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.status ? { status: filters.status as any } : {}),
    ...(filters.search
      ? {
          OR: [
            { fullName: { contains: filters.search, mode: 'insensitive' as const } },
            { email: { contains: filters.search, mode: 'insensitive' as const } },
            { employeeId: { contains: filters.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: SELECT_SAFE,
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page: filters.page, pageSize: filters.pageSize };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: SELECT_SAFE });
  if (!user) throw HttpError.notFound('User not found');
  return user;
}

export async function updateUser(
  actor: AuthUser,
  id: string,
  input: { fullName?: string; phone?: string; employeeId?: string; department?: string; status?: any; role?: Role },
) {
  const before = await getUserById(id);

  if (input.role === Role.SUPER_ADMIN && actor.role !== Role.SUPER_ADMIN) {
    throw HttpError.forbidden('Only a Super Admin can promote a user to Super Admin');
  }
  if (before.role === Role.SUPER_ADMIN && actor.role !== Role.SUPER_ADMIN) {
    throw HttpError.forbidden('Only a Super Admin can modify another Super Admin account');
  }
  if (input.employeeId) {
    const duplicateEmployeeId = await prisma.user.findUnique({ where: { employeeId: input.employeeId } });
    if (duplicateEmployeeId && duplicateEmployeeId.id !== id) throw HttpError.conflict('A user with this Employee ID already exists');
  }

  const user = await prisma.user.update({ where: { id }, data: input, select: SELECT_SAFE });
  if (input.role && input.role !== before.role) {
    await syncPrimaryUserRole(id, input.role);
  }
  await recordAudit({ actorId: actor.id, action: 'UPDATE', entityType: 'User', entityId: id, before, after: user });
  return user;
}

export async function updateOwnProfile(actor: AuthUser, input: { fullName?: string; phone?: string }) {
  const before = await getUserById(actor.id);
  const user = await prisma.user.update({ where: { id: actor.id }, data: input, select: SELECT_SAFE });
  await recordAudit({ actorId: actor.id, action: 'UPDATE_OWN_PROFILE', entityType: 'User', entityId: actor.id, before, after: user });
  return user;
}

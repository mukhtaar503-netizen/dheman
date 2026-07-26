import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { recordAudit } from '@/utils/audit';
import { AuthUser } from '@/middleware/auth';
import { PermissionKey } from '@/config/permissions';

/** Union of permission keys granted by every AppRole assigned to a user (via UserRole). */
export async function getUserPermissionKeys(userId: string): Promise<Set<string>> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
  });

  const keys = new Set<string>();
  for (const userRole of userRoles) {
    for (const rp of userRole.role.rolePermissions) {
      keys.add(rp.permission.key);
    }
  }
  return keys;
}

export async function userHasPermission(userId: string, permissionKeys: string[]): Promise<boolean> {
  if (permissionKeys.length === 0) return true;
  const count = await prisma.userRole.count({
    where: {
      userId,
      role: { rolePermissions: { some: { permission: { key: { in: permissionKeys } } } } },
    },
  });
  return count > 0;
}

/** Ensures a user's UserRole rows reflect their current primary `role` enum field — called on create/role-change. */
export async function syncPrimaryUserRole(userId: string, role: Role) {
  const appRole = await prisma.appRole.findUnique({ where: { name: role } });
  if (!appRole) return; // seed not run yet — fails open to avoid blocking auth in dev before first seed

  const existing = await prisma.userRole.findMany({ where: { userId }, include: { role: true } });
  const alreadyHasIt = existing.some((ur) => ur.roleId === appRole.id);
  if (!alreadyHasIt) {
    await prisma.userRole.create({ data: { userId, roleId: appRole.id } });
  }
  // Remove any other *system* role previously assigned as "primary" — custom, admin-granted
  // extra roles (isSystem: false, or explicitly kept) are left untouched.
  const staleSystemRoles = existing.filter((ur) => ur.role.isSystem && ur.roleId !== appRole.id);
  if (staleSystemRoles.length > 0) {
    await prisma.userRole.deleteMany({ where: { id: { in: staleSystemRoles.map((ur) => ur.id) } } });
  }
}

export async function listRoles() {
  return prisma.appRole.findMany({
    include: { rolePermissions: { include: { permission: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function listPermissions() {
  return prisma.appPermission.findMany({ orderBy: [{ module: 'asc' }, { key: 'asc' }] });
}

export async function createRole(actor: AuthUser, input: { name: string; description?: string }) {
  const existing = await prisma.appRole.findUnique({ where: { name: input.name } });
  if (existing) throw HttpError.conflict('A role with this name already exists');

  const role = await prisma.appRole.create({ data: { name: input.name, description: input.description, isSystem: false } });
  await recordAudit({ actorId: actor.id, action: 'CREATE', entityType: 'AppRole', entityId: role.id, after: role });
  return role;
}

/** Replaces a role's full permission set with the given list of permission keys. */
export async function setRolePermissions(actor: AuthUser, roleId: string, permissionKeys: string[]) {
  const role = await prisma.appRole.findUnique({ where: { id: roleId } });
  if (!role) throw HttpError.notFound('Role not found');

  const permissions = await prisma.appPermission.findMany({ where: { key: { in: permissionKeys } } });
  if (permissions.length !== permissionKeys.length) {
    throw HttpError.badRequest('One or more permission keys are invalid');
  }

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({ data: permissions.map((p) => ({ roleId, permissionId: p.id })) }),
  ]);

  await recordAudit({ actorId: actor.id, action: 'SET_PERMISSIONS', entityType: 'AppRole', entityId: roleId, after: { permissionKeys } });
  return listRoles();
}

export async function assignRoleToUser(actor: AuthUser, userId: string, roleId: string) {
  const [user, role] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.appRole.findUnique({ where: { id: roleId } }),
  ]);
  if (!user) throw HttpError.notFound('User not found');
  if (!role) throw HttpError.notFound('Role not found');

  const userRole = await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    update: {},
    create: { userId, roleId },
  });
  await recordAudit({ actorId: actor.id, action: 'ASSIGN_ROLE', entityType: 'User', entityId: userId, after: { roleId } });
  return userRole;
}

export async function removeRoleFromUser(actor: AuthUser, userId: string, roleId: string) {
  await prisma.userRole.deleteMany({ where: { userId, roleId } });
  await recordAudit({ actorId: actor.id, action: 'REMOVE_ROLE', entityType: 'User', entityId: userId, before: { roleId } });
}

export async function getUserRoles(userId: string) {
  return prisma.userRole.findMany({ where: { userId }, include: { role: true } });
}

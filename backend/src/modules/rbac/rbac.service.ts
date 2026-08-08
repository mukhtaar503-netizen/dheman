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

// requirePermission() calls userHasPermission() on every protected request (some routes chain
// two or more), each doing a 3-table join with no caching. Since role/permission assignments
// change rarely (admin actions), a short-TTL cache with explicit invalidation on every RBAC
// mutation (below) cuts that DB round-trip for the common case without risking stale access:
// a permission revocation still takes effect immediately via the explicit clear, and the TTL
// only matters as a fallback bound on staleness, not the primary correctness mechanism.
const PERMISSION_CACHE_TTL_MS = 60_000;
const permissionCache = new Map<string, { result: boolean; expiresAt: number }>();

export function clearPermissionCache() {
  permissionCache.clear();
}

export async function userHasPermission(userId: string, permissionKeys: string[]): Promise<boolean> {
  if (permissionKeys.length === 0) return true;

  const cacheKey = `${userId}:${[...permissionKeys].sort().join(',')}`;
  const cached = permissionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const count = await prisma.userRole.count({
    where: {
      userId,
      role: { rolePermissions: { some: { permission: { key: { in: permissionKeys } } } } },
    },
  });
  const result = count > 0;
  permissionCache.set(cacheKey, { result, expiresAt: Date.now() + PERMISSION_CACHE_TTL_MS });
  return result;
}

/** Ensures a user's UserRole rows reflect their current primary `role` enum field — called on create/role-change. */
export async function syncPrimaryUserRole(userId: string, role: Role) {
  const appRole = await prisma.appRole.findUnique({ where: { name: role } });
  if (!appRole) {
    // Fails open (doesn't block user creation/login) so a fresh DB before the first seed
    // doesn't lock everyone out — but this leaves the user with zero UserRole rows, so
    // every requirePermission() check will 403 them despite their `role` field/JWT
    // looking correct. That's silent and confusing, so make it loud instead: run
    // `npx prisma db seed` against this database — it's idempotent and backfills a
    // UserRole for every existing user from their current `role` field.
    // eslint-disable-next-line no-console
    console.warn(
      `[rbac] No AppRole row found for "${role}" — user ${userId} was created/updated with zero effective permissions. Run "npx prisma db seed" against this database to fix it.`,
    );
    return;
  }

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
  clearPermissionCache();
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
  clearPermissionCache();
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
  clearPermissionCache();
  return userRole;
}

export async function removeRoleFromUser(actor: AuthUser, userId: string, roleId: string) {
  await prisma.userRole.deleteMany({ where: { userId, roleId } });
  await recordAudit({ actorId: actor.id, action: 'REMOVE_ROLE', entityType: 'User', entityId: userId, before: { roleId } });
  clearPermissionCache();
}

export async function getUserRoles(userId: string) {
  return prisma.userRole.findMany({ where: { userId }, include: { role: true } });
}

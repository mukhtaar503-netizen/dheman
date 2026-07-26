import { Request, Response, NextFunction } from 'express';
import { HttpError } from '@/utils/http-error';
import { userHasPermission } from '@/modules/rbac/rbac.service';
import { PermissionKey } from '@/config/permissions';

/**
 * Dynamic, DB-driven authorization gate — the primary route-level RBAC mechanism.
 * Grants access if the authenticated user holds ANY of the listed permission keys
 * through any of their assigned AppRoles (UserRole -> AppRole -> RolePermission).
 * Reserve requireRole() for identity-scoped self-service routes (e.g. a Customer
 * reading their own record) rather than admin-configurable permissions.
 */
export function requirePermission(...permissionKeys: PermissionKey[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(HttpError.unauthorized());
    try {
      const allowed = await userHasPermission(req.user.id, permissionKeys);
      if (!allowed) {
        return next(HttpError.forbidden(`Missing required permission: ${permissionKeys.join(' or ')}`));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

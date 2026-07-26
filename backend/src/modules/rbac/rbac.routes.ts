import { Router } from 'express';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth } from '@/middleware/auth';
import { requirePermission } from '@/middleware/permission';
import { PERMISSIONS } from '@/config/permissions';
import * as controller from './rbac.controller';
import { createRoleSchema, setRolePermissionsSchema } from './rbac.schema';

// Mounted at root ('/') — defines /roles and /permissions directly rather than a
// shared prefix, since those are two distinct top-level resources.
//
// IMPORTANT: auth/permission checks are applied per-route below, NOT via a blanket
// router.use() gate. A blanket gate on a router mounted at '/' runs for every request
// that reaches this mount point — including ones that don't match any route defined
// here — which would 403 the entire API before Express ever falls through to the
// next router (materials, tasks, dashboard, ...) in routes.ts.
const router = Router();
const gate = [requireAuth, requirePermission(PERMISSIONS.ROLES_MANAGE)];

/**
 * @openapi
 * /roles:
 *   get:
 *     summary: List all AppRoles with their assigned permissions ("Role & permission management")
 *     tags: [RBAC]
 */
router.get('/roles', ...gate, asyncHandler(controller.listRoles));

/**
 * @openapi
 * /roles:
 *   post:
 *     summary: Create a custom AppRole
 *     tags: [RBAC]
 */
router.post('/roles', ...gate, validate(createRoleSchema), asyncHandler(controller.createRole));

/**
 * @openapi
 * /roles/{id}/permissions:
 *   put:
 *     summary: Replace an AppRole's full permission set
 *     tags: [RBAC]
 */
router.put('/roles/:id/permissions', ...gate, validate(setRolePermissionsSchema), asyncHandler(controller.setRolePermissions));

/**
 * @openapi
 * /permissions:
 *   get:
 *     summary: List the full permission catalog, grouped by module
 *     tags: [RBAC]
 */
router.get('/permissions', ...gate, asyncHandler(controller.listPermissions));

export default router;

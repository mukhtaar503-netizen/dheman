import { Router } from 'express';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth } from '@/middleware/auth';
import { requirePermission } from '@/middleware/permission';
import { PERMISSIONS } from '@/config/permissions';
import * as usersController from './users.controller';
import * as rbacController from '@/modules/rbac/rbac.controller';
import { assignRoleSchema, removeRoleSchema } from '@/modules/rbac/rbac.schema';
import {
  addEmployeeDocumentSchema,
  createUserSchema,
  employeeDocumentParamsSchema,
  listUsersSchema,
  requestEmployeeDocumentUploadUrlSchema,
  updateOwnProfileSchema,
  updateUserSchema,
} from './users.schema';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /users/me:
 *   get:
 *     summary: Get the logged-in staff user's own profile (Session Management / User Profile)
 *     tags: [Users]
 */
router.get('/me', asyncHandler(usersController.getOwnProfile));

/**
 * @openapi
 * /users/me:
 *   patch:
 *     summary: Update the logged-in staff user's own profile (name/phone only — not role/status)
 *     tags: [Users]
 */
router.patch('/me', validate(updateOwnProfileSchema), asyncHandler(usersController.updateOwnProfile));

router.use(requirePermission(PERMISSIONS.USERS_MANAGE));

/**
 * @openapi
 * /users/statistics:
 *   get:
 *     summary: Employee Management dashboard statistics — totals by status/department
 *     tags: [Users]
 */
router.get('/statistics', asyncHandler(usersController.getStatistics));

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create an internal staff user (FR-SET-03)
 *     tags: [Users]
 */
router.post('/', validate(createUserSchema), asyncHandler(usersController.createUser));

/**
 * @openapi
 * /users:
 *   get:
 *     summary: List users with optional role/status filters
 *     tags: [Users]
 */
router.get('/', validate(listUsersSchema), asyncHandler(usersController.listUsers));

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     tags: [Users]
 */
router.get('/:id', asyncHandler(usersController.getUser));

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     summary: Update a user's profile, role, or status
 *     tags: [Users]
 */
router.patch('/:id', validate(updateUserSchema), asyncHandler(usersController.updateUser));

/**
 * @openapi
 * /users/{id}/documents/upload-url:
 *   post:
 *     summary: Mint a signed Supabase Storage upload URL for an Employee document/photo
 *     tags: [Users]
 */
router.post(
  '/:id/documents/upload-url',
  validate(requestEmployeeDocumentUploadUrlSchema),
  asyncHandler(usersController.requestDocumentUploadUrl),
);

/**
 * @openapi
 * /users/{id}/documents:
 *   post:
 *     summary: Record an Employee document after it's been uploaded to storage
 *     tags: [Users]
 */
router.post('/:id/documents', validate(addEmployeeDocumentSchema), asyncHandler(usersController.addDocument));

/**
 * @openapi
 * /users/{id}/documents/{documentId}:
 *   delete:
 *     summary: Delete an Employee document
 *     tags: [Users]
 */
router.delete('/:id/documents/:documentId', validate(employeeDocumentParamsSchema), asyncHandler(usersController.deleteDocument));

/**
 * @openapi
 * /users/{id}/roles:
 *   get:
 *     summary: List a user's assigned AppRoles (Role & permission management) — requires roles.manage
 *     tags: [Users, RBAC]
 */
router.get('/:id/roles', requirePermission(PERMISSIONS.ROLES_MANAGE), asyncHandler(rbacController.getUserRoles));

/**
 * @openapi
 * /users/{id}/roles:
 *   post:
 *     summary: Assign an additional AppRole to a user, on top of their primary role — requires roles.manage
 *     tags: [Users, RBAC]
 */
router.post(
  '/:id/roles',
  requirePermission(PERMISSIONS.ROLES_MANAGE),
  validate(assignRoleSchema),
  asyncHandler(rbacController.assignRoleToUser),
);

/**
 * @openapi
 * /users/{id}/roles/{roleId}:
 *   delete:
 *     summary: Remove an AppRole from a user — requires roles.manage
 *     tags: [Users, RBAC]
 */
router.delete(
  '/:id/roles/:roleId',
  requirePermission(PERMISSIONS.ROLES_MANAGE),
  validate(removeRoleSchema),
  asyncHandler(rbacController.removeRoleFromUser),
);

export default router;

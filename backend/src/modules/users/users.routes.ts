import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth, requireRole } from '@/middleware/auth';
import * as usersController from './users.controller';
import { createUserSchema, listUsersSchema, updateUserSchema } from './users.schema';

const router = Router();
router.use(requireAuth, requireRole(Role.SUPER_ADMIN, Role.ADMIN));

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

export default router;

import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth, requireRole } from '@/middleware/auth';
import * as controller from './tasks.controller';
import { addPhotoSchema, assignTechniciansSchema, createTaskSchema, logTimeSchema, reopenTaskSchema, updateTaskStatusSchema } from './tasks.schema';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /tasks/me:
 *   get:
 *     summary: Technician views their own assigned Tasks (FR-SCHED-05)
 *     tags: [Tasks]
 */
router.get('/me', requireRole(Role.TECHNICIAN), asyncHandler(controller.listMyTasks));

const TECH_OR_UP = [Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.SUPERVISOR, Role.TECHNICIAN] as const;
router.use(requireRole(...TECH_OR_UP));

router.get('/', asyncHandler(controller.listTasks));
router.get('/:id', asyncHandler(controller.getTask));

/**
 * @openapi
 * /tasks/{id}/start:
 *   post:
 *     summary: Technician starts a Task (FR-TASK-02)
 *     tags: [Tasks]
 */
router.post('/:id/start', validate(updateTaskStatusSchema), asyncHandler(controller.startTask));

/**
 * @openapi
 * /tasks/{id}/complete:
 *   post:
 *     summary: Technician marks a Task Completed with at least one photo (FR-TASK-04, FR-TASK-05)
 *     tags: [Tasks]
 */
router.post('/:id/complete', validate(updateTaskStatusSchema), asyncHandler(controller.completeTask));

/**
 * @openapi
 * /tasks/{id}/photos:
 *   post:
 *     summary: Upload a Task progress photo (FR-TASK-05)
 *     tags: [Tasks]
 */
router.post('/:id/photos', validate(addPhotoSchema), asyncHandler(controller.addPhoto));

/**
 * @openapi
 * /tasks/{id}/time-logs:
 *   post:
 *     summary: Log time spent on a Task (FR-TASK-08)
 *     tags: [Tasks]
 */
router.post('/:id/time-logs', validate(logTimeSchema), asyncHandler(controller.logTime));

router.use(requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.SUPERVISOR));

/**
 * @openapi
 * /tasks:
 *   post:
 *     summary: Break a Project down into a Task (FR-TASK-01)
 *     tags: [Tasks]
 */
router.post('/', validate(createTaskSchema), asyncHandler(controller.createTask));

/**
 * @openapi
 * /tasks/{id}/assign:
 *   post:
 *     summary: Assign Technician(s) to a Task (FR-TASK-03, FR-SCHED-02)
 *     tags: [Tasks]
 */
router.post('/:id/assign', validate(assignTechniciansSchema), asyncHandler(controller.assignTechnicians));

/**
 * @openapi
 * /tasks/{id}/verify:
 *   post:
 *     summary: Supervisor verifies a Completed Task (FR-TASK-06)
 *     tags: [Tasks]
 */
router.post('/:id/verify', asyncHandler(controller.verifyTask));

/**
 * @openapi
 * /tasks/{id}/reopen:
 *   post:
 *     summary: Reopen a Task with a mandatory reason (FR-TASK-09)
 *     tags: [Tasks]
 */
router.post('/:id/reopen', validate(reopenTaskSchema), asyncHandler(controller.reopenTask));

export default router;

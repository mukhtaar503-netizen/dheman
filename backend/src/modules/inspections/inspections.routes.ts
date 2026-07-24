import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth, requireRole } from '@/middleware/auth';
import * as controller from './inspections.controller';
import { rescheduleInspectionSchema, scheduleInspectionSchema, submitInspectionSchema } from './inspections.schema';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /inspections/me:
 *   get:
 *     summary: Site Inspector views their own schedule (FR-SCHED-05)
 *     tags: [Inspections]
 */
router.get('/me', requireRole(Role.SITE_INSPECTOR), asyncHandler(controller.listMyInspections));

/**
 * @openapi
 * /inspections/{id}/submit:
 *   post:
 *     summary: Site Inspector submits checklist, measurements, and photos (FR-INSP-02..06)
 *     tags: [Inspections]
 */
router.post(
  '/:id/submit',
  requireRole(Role.SITE_INSPECTOR, Role.SUPER_ADMIN, Role.ADMIN),
  validate(submitInspectionSchema),
  asyncHandler(controller.submitInspection),
);

router.get('/:id', asyncHandler(controller.getInspection));

router.use(requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER));

/**
 * @openapi
 * /inspections:
 *   post:
 *     summary: Schedule a Site Inspection (FR-INSP-01)
 *     tags: [Inspections]
 */
router.post('/', validate(scheduleInspectionSchema), asyncHandler(controller.scheduleInspection));

/**
 * @openapi
 * /inspections:
 *   get:
 *     summary: List Site Inspections
 *     tags: [Inspections]
 */
router.get('/', asyncHandler(controller.listInspections));

/**
 * @openapi
 * /inspections/{id}:
 *   patch:
 *     summary: Reschedule or cancel a Site Inspection (FR-INSP-07)
 *     tags: [Inspections]
 */
router.patch('/:id', validate(rescheduleInspectionSchema), asyncHandler(controller.reschedule));

export default router;

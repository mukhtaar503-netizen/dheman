import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth, requireRole } from '@/middleware/auth';
import { requirePermission } from '@/middleware/permission';
import { PERMISSIONS } from '@/config/permissions';
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
  requirePermission(PERMISSIONS.INSPECTIONS_SUBMIT),
  validate(submitInspectionSchema),
  asyncHandler(controller.submitInspection),
);

router.get('/:id', requirePermission(PERMISSIONS.INSPECTIONS_SUBMIT, PERMISSIONS.INSPECTIONS_MANAGE), asyncHandler(controller.getInspection));

router.use(requirePermission(PERMISSIONS.INSPECTIONS_MANAGE));

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

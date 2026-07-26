import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth, requireRole } from '@/middleware/auth';
import { requirePermission } from '@/middleware/permission';
import { PERMISSIONS } from '@/config/permissions';
import * as controller from './technicians.controller';
import { calendarQuerySchema, decideLeaveSchema, listTechniciansSchema, requestLeaveSchema, updateTechnicianProfileSchema } from './technicians.schema';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /technicians/leave-requests:
 *   post:
 *     summary: Technician requests leave/unavailability (FR-TECH-05)
 *     tags: [Technicians]
 */
router.post('/leave-requests', requireRole(Role.TECHNICIAN), validate(requestLeaveSchema), asyncHandler(controller.requestLeave));

router.use(requirePermission(PERMISSIONS.TECHNICIANS_MANAGE));

/**
 * @openapi
 * /technicians:
 *   get:
 *     summary: List/filter Technicians by skill and availability (FR-TECH-01..03)
 *     tags: [Technicians]
 */
router.get('/', validate(listTechniciansSchema), asyncHandler(controller.listTechnicians));

/**
 * @openapi
 * /technicians/schedule:
 *   get:
 *     summary: Unified scheduling calendar of inspections + tasks (FR-SCHED-01)
 *     tags: [Technicians]
 */
router.get('/schedule', validate(calendarQuerySchema), asyncHandler(controller.getSchedule));

router.get('/:id', asyncHandler(controller.getTechnician));
router.patch('/:id', validate(updateTechnicianProfileSchema), asyncHandler(controller.updateTechnician));
router.get('/:id/history', asyncHandler(controller.getHistory));
router.get('/:id/productivity', asyncHandler(controller.getProductivity));

/**
 * @openapi
 * /technicians/leave-requests/{leaveId}/decide:
 *   post:
 *     summary: Approve/reject a Technician leave request (FR-TECH-05)
 *     tags: [Technicians]
 */
router.post(
  '/leave-requests/:leaveId/decide',
  requirePermission(PERMISSIONS.TECHNICIANS_APPROVE_LEAVE),
  validate(decideLeaveSchema),
  asyncHandler(controller.decideLeave),
);

export default router;

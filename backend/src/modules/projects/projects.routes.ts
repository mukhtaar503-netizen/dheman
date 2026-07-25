import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth, requireRole } from '@/middleware/auth';
import * as controller from './projects.controller';
import {
  addDocumentSchema,
  addSupervisorSchema,
  completeMilestoneSchema,
  createMilestoneSchema,
  createProjectFromQuotationSchema,
  holdOrCancelSchema,
  listProjectsSchema,
  updateProjectSchema,
} from './projects.schema';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /projects/me:
 *   get:
 *     summary: Customer views their own Projects (FR-PROJ-08)
 *     tags: [Projects]
 */
router.get('/me', requireRole(Role.CUSTOMER), validate(listProjectsSchema), asyncHandler(controller.listOwnProjects));

/**
 * @openapi
 * /projects/{id}/sign-off:
 *   post:
 *     summary: Customer records digital sign-off on a Completed Project (FR-PROJ-10)
 *     tags: [Projects]
 */
router.post('/:id/sign-off', requireRole(Role.CUSTOMER), asyncHandler(controller.customerSignOff));

router.get('/:id', asyncHandler(controller.getProject));

router.use(requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.SUPERVISOR));

/**
 * @openapi
 * /projects:
 *   get:
 *     summary: List Projects (FR-PROJ-02)
 *     tags: [Projects]
 */
router.get('/', validate(listProjectsSchema), asyncHandler(controller.listProjects));

router.use(requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER));

/**
 * @openapi
 * /projects:
 *   post:
 *     summary: Create a Project from an Approved Quotation (FR-PROJ-01, BR-PROJ-01)
 *     tags: [Projects]
 */
router.post('/', validate(createProjectFromQuotationSchema), asyncHandler(controller.createProject));

router.patch('/:id', validate(updateProjectSchema), asyncHandler(controller.updateProject));

/**
 * @openapi
 * /projects/{id}/supervisors:
 *   post:
 *     summary: Assign a Supervisor to a Project (FR-PROJ-03)
 *     tags: [Projects]
 */
router.post('/:id/supervisors', validate(addSupervisorSchema), asyncHandler(controller.addSupervisor));

/**
 * @openapi
 * /projects/{id}/milestones:
 *   post:
 *     summary: Add a Milestone (FR-PROJ-04)
 *     tags: [Projects]
 */
router.post('/:id/milestones', validate(createMilestoneSchema), asyncHandler(controller.addMilestone));

router.post('/:id/milestones/:milestoneId/complete', validate(completeMilestoneSchema), asyncHandler(controller.completeMilestone));

/**
 * @openapi
 * /projects/{id}/documents:
 *   post:
 *     summary: Attach a document to a Project (FR-PROJ-07)
 *     tags: [Projects]
 */
router.post('/:id/documents', validate(addDocumentSchema), asyncHandler(controller.addDocument));

/**
 * @openapi
 * /projects/{id}/complete:
 *   post:
 *     summary: Mark a Project Completed — blocked while Tasks remain unverified (BR-PROJ-03)
 *     tags: [Projects]
 */
router.post('/:id/complete', asyncHandler(controller.completeProject));

/**
 * @openapi
 * /projects/{id}/close:
 *   post:
 *     summary: Close a Completed Project — blocked while Invoices remain unpaid (BR-PROJ-04)
 *     tags: [Projects]
 */
router.post('/:id/close', asyncHandler(controller.closeProject));

/**
 * @openapi
 * /projects/{id}/hold:
 *   post:
 *     summary: Place a Project On Hold with a mandatory reason (BR-PROJ-05)
 *     tags: [Projects]
 */
router.post('/:id/hold', validate(holdOrCancelSchema), asyncHandler(controller.holdProject));

/**
 * @openapi
 * /projects/{id}/cancel:
 *   post:
 *     summary: Cancel a Project with a mandatory reason (BR-PROJ-05)
 *     tags: [Projects]
 */
router.post('/:id/cancel', validate(holdOrCancelSchema), asyncHandler(controller.cancelProject));

export default router;

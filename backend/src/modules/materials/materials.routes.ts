import { Router } from 'express';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth } from '@/middleware/auth';
import { requirePermission } from '@/middleware/permission';
import { PERMISSIONS } from '@/config/permissions';
import * as controller from './materials.controller';
import { createMaterialEntrySchema } from './materials.schema';

const router = Router();
router.use(requireAuth, requirePermission(PERMISSIONS.MATERIALS_MANAGE));

/**
 * @openapi
 * /materials:
 *   post:
 *     summary: Record Estimated or Actual material usage (FR-MAT-01, FR-MAT-02)
 *     tags: [Materials]
 */
router.post('/', validate(createMaterialEntrySchema), asyncHandler(controller.createEntry));

/**
 * @openapi
 * /materials/project/{projectId}:
 *   get:
 *     summary: Get material entries and Estimated-vs-Actual variance for a Project (FR-MAT-03)
 *     tags: [Materials]
 */
router.get('/project/:projectId', asyncHandler(controller.getForProject));

export default router;

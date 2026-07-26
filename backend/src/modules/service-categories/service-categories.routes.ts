import { Router } from 'express';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth } from '@/middleware/auth';
import { requirePermission } from '@/middleware/permission';
import { PERMISSIONS } from '@/config/permissions';
import * as service from './service-categories.service';
import { createServiceCategorySchema, updateServiceCategorySchema } from './service-categories.schema';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /service-categories:
 *   get:
 *     summary: List the Service Catalog (FR-SVC-01)
 *     tags: [ServiceCategories]
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.status(200).json(await service.listCategories(req.query.includeInactive === 'true'));
  }),
);

router.get('/:id', asyncHandler(async (req, res) => res.status(200).json(await service.getCategoryById(req.params.id))));

router.use(requirePermission(PERMISSIONS.SERVICE_CATEGORIES_MANAGE));

/**
 * @openapi
 * /service-categories:
 *   post:
 *     summary: Create a Service Category (FR-SVC-01, FR-SVC-02, FR-SVC-03)
 *     tags: [ServiceCategories]
 */
router.post(
  '/',
  validate(createServiceCategorySchema),
  asyncHandler(async (req, res) => res.status(201).json(await service.createCategory(req.user!, req.body))),
);

/**
 * @openapi
 * /service-categories/{id}:
 *   patch:
 *     summary: Update a Service Category (FR-SVC-05)
 *     tags: [ServiceCategories]
 */
router.patch(
  '/:id',
  validate(updateServiceCategorySchema),
  asyncHandler(async (req, res) => res.status(200).json(await service.updateCategory(req.user!, req.params.id, req.body))),
);

/**
 * @openapi
 * /service-categories/{id}/deactivate:
 *   post:
 *     summary: Deactivate a Service Category without deleting history (FR-SVC-04)
 *     tags: [ServiceCategories]
 */
router.post('/:id/deactivate', asyncHandler(async (req, res) => res.status(200).json(await service.deactivateCategory(req.user!, req.params.id))));

export default router;

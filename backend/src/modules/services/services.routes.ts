import { Router } from 'express';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth } from '@/middleware/auth';
import { requirePermission } from '@/middleware/permission';
import { PERMISSIONS } from '@/config/permissions';
import * as servicesController from './services.controller';
import { createServiceSchema, listServicesSchema, serviceIdParamsSchema, updateServiceSchema } from './services.schema';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /services/statistics:
 *   get:
 *     summary: Service dashboard statistics (totals, active/inactive, by category)
 *     tags: [Services]
 */
router.get('/statistics', asyncHandler(servicesController.getStatistics));

/**
 * @openapi
 * /services:
 *   get:
 *     summary: List/search the installable-services catalog, filterable by category/status
 *     tags: [Services]
 */
router.get('/', validate(listServicesSchema), asyncHandler(servicesController.listServices));

/**
 * @openapi
 * /services/{id}:
 *   get:
 *     summary: Get a single service
 *     tags: [Services]
 */
router.get('/:id', validate(serviceIdParamsSchema), asyncHandler(servicesController.getService));

router.use(requirePermission(PERMISSIONS.SERVICES_MANAGE));

/**
 * @openapi
 * /services:
 *   post:
 *     summary: Create a service in the catalog
 *     tags: [Services]
 */
router.post('/', validate(createServiceSchema), asyncHandler(servicesController.createService));

/**
 * @openapi
 * /services/{id}:
 *   patch:
 *     summary: Update a service
 *     tags: [Services]
 */
router.patch('/:id', validate(updateServiceSchema), asyncHandler(servicesController.updateService));

/**
 * @openapi
 * /services/{id}/activate:
 *   post:
 *     summary: Mark a service Active (visible for new job/quotation creation)
 *     tags: [Services]
 */
router.post('/:id/activate', validate(serviceIdParamsSchema), asyncHandler(servicesController.activateService));

/**
 * @openapi
 * /services/{id}/deactivate:
 *   post:
 *     summary: Mark a service Inactive (hidden from new job/quotation creation, history preserved)
 *     tags: [Services]
 */
router.post('/:id/deactivate', validate(serviceIdParamsSchema), asyncHandler(servicesController.deactivateService));

/**
 * @openapi
 * /services/{id}:
 *   delete:
 *     summary: Delete a service (blocked if linked to an active project)
 *     tags: [Services]
 */
router.delete('/:id', validate(serviceIdParamsSchema), asyncHandler(servicesController.deleteService));

export default router;

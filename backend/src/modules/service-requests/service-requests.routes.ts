import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth, requireRole } from '@/middleware/auth';
import { requirePermission } from '@/middleware/permission';
import { PERMISSIONS } from '@/config/permissions';
import * as controller from './service-requests.controller';
import {
  createOwnServiceRequestSchema,
  createServiceRequestSchema,
  listServiceRequestsSchema,
  updateServiceRequestSchema,
} from './service-requests.schema';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /service-requests/me:
 *   post:
 *     summary: Customer submits a new Service Request (FR-SR-01)
 *     tags: [ServiceRequests]
 */
router.post('/me', requireRole(Role.CUSTOMER), validate(createOwnServiceRequestSchema), asyncHandler(controller.createOwnServiceRequest));

/**
 * @openapi
 * /service-requests/me:
 *   get:
 *     summary: Customer views their own Service Requests (FR-SR-08)
 *     tags: [ServiceRequests]
 */
router.get('/me', requireRole(Role.CUSTOMER), asyncHandler(controller.listOwnServiceRequests));

router.use(requirePermission(PERMISSIONS.SERVICE_REQUESTS_MANAGE));

/**
 * @openapi
 * /service-requests:
 *   post:
 *     summary: Staff creates a Service Request on behalf of a Customer (FR-SR-02)
 *     tags: [ServiceRequests]
 */
router.post('/', validate(createServiceRequestSchema), asyncHandler(controller.createServiceRequest));

/**
 * @openapi
 * /service-requests:
 *   get:
 *     summary: List Service Requests (FR-SR-03)
 *     tags: [ServiceRequests]
 */
router.get('/', validate(listServiceRequestsSchema), asyncHandler(controller.listServiceRequests));

router.get('/:id', asyncHandler(controller.getServiceRequest));

/**
 * @openapi
 * /service-requests/{id}:
 *   patch:
 *     summary: Update status / owner of a Service Request (FR-SR-03, FR-SR-05)
 *     tags: [ServiceRequests]
 */
router.patch('/:id', validate(updateServiceRequestSchema), asyncHandler(controller.updateServiceRequest));

export default router;

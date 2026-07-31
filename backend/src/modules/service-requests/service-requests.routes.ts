import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth, requireRole } from '@/middleware/auth';
import { requirePermission } from '@/middleware/permission';
import { PERMISSIONS } from '@/config/permissions';
import * as controller from './service-requests.controller';
import {
  addServiceRequestAttachmentSchema,
  createOwnServiceRequestSchema,
  createServiceRequestSchema,
  listServiceRequestsSchema,
  requestAttachmentUploadUrlSchema,
  serviceRequestIdParamsSchema,
  updateServiceRequestSchema,
  updateServiceRequestStatusSchema,
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
router.get('/me', requireRole(Role.CUSTOMER), validate(listServiceRequestsSchema), asyncHandler(controller.listOwnServiceRequests));

/**
 * @openapi
 * /service-requests/me/{id}/attachments/upload-url:
 *   post:
 *     summary: Customer mints a signed upload URL for an attachment on their own request
 *     tags: [ServiceRequests]
 */
router.post(
  '/me/:id/attachments/upload-url',
  requireRole(Role.CUSTOMER),
  validate(requestAttachmentUploadUrlSchema),
  asyncHandler(controller.requestOwnAttachmentUploadUrl),
);

/**
 * @openapi
 * /service-requests/me/{id}/attachments:
 *   post:
 *     summary: Customer records an attachment on their own request after uploading it
 *     tags: [ServiceRequests]
 */
router.post(
  '/me/:id/attachments',
  requireRole(Role.CUSTOMER),
  validate(addServiceRequestAttachmentSchema),
  asyncHandler(controller.addOwnAttachment),
);

router.use(requirePermission(PERMISSIONS.SERVICE_REQUESTS_MANAGE));

/**
 * @openapi
 * /service-requests/statistics:
 *   get:
 *     summary: Service Request dashboard statistics (totals, pending, inspections, trends)
 *     tags: [ServiceRequests]
 */
router.get('/statistics', asyncHandler(controller.getStatistics));

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
 *     summary: List Service Requests (FR-SR-03), filterable by status/priority/service/date, searchable, sortable
 *     tags: [ServiceRequests]
 */
router.get('/', validate(listServiceRequestsSchema), asyncHandler(controller.listServiceRequests));

router.get('/:id', validate(serviceRequestIdParamsSchema), asyncHandler(controller.getServiceRequest));

/**
 * @openapi
 * /service-requests/{id}:
 *   patch:
 *     summary: Update a Service Request's details (FR-SR-03) — status changes go through /status
 *     tags: [ServiceRequests]
 */
router.patch('/:id', validate(updateServiceRequestSchema), asyncHandler(controller.updateServiceRequest));

/**
 * @openapi
 * /service-requests/{id}/status:
 *   patch:
 *     summary: Change a Service Request's status (FR-SR-05) — notifies the submitting customer
 *     tags: [ServiceRequests]
 */
router.patch('/:id/status', validate(updateServiceRequestStatusSchema), asyncHandler(controller.updateServiceRequestStatus));

/**
 * @openapi
 * /service-requests/{id}:
 *   delete:
 *     summary: Delete a Service Request (blocked once a Quotation has been created for it)
 *     tags: [ServiceRequests]
 */
router.delete('/:id', validate(serviceRequestIdParamsSchema), asyncHandler(controller.deleteServiceRequest));

/**
 * @openapi
 * /service-requests/{id}/attachments/upload-url:
 *   post:
 *     summary: Staff mints a signed upload URL for a Service Request attachment
 *     tags: [ServiceRequests]
 */
router.post(
  '/:id/attachments/upload-url',
  validate(requestAttachmentUploadUrlSchema),
  asyncHandler(controller.requestAttachmentUploadUrl),
);

/**
 * @openapi
 * /service-requests/{id}/attachments:
 *   post:
 *     summary: Staff records a Service Request attachment after it's been uploaded to storage
 *     tags: [ServiceRequests]
 */
router.post('/:id/attachments', validate(addServiceRequestAttachmentSchema), asyncHandler(controller.addAttachment));

export default router;

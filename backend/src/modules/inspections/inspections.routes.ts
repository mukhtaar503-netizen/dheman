import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth, requireRole } from '@/middleware/auth';
import { requirePermission } from '@/middleware/permission';
import { PERMISSIONS } from '@/config/permissions';
import * as controller from './inspections.controller';
import {
  addInspectionPhotoSchema,
  inspectionIdParamsSchema,
  listInspectionsSchema,
  requestInspectionPhotoUploadUrlSchema,
  rescheduleInspectionSchema,
  scheduleInspectionSchema,
  submitInspectionSchema,
  updateInspectionDetailsSchema,
} from './inspections.schema';

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
 * /inspections/completed:
 *   get:
 *     summary: List completed Site Inspections available as a Quotation source (customer/service/estimates only)
 *     tags: [Inspections]
 */
router.get(
  '/completed',
  requirePermission(PERMISSIONS.INSPECTIONS_MANAGE, PERMISSIONS.QUOTATIONS_MANAGE),
  asyncHandler(controller.listCompletedInspections),
);

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

/**
 * @openapi
 * /inspections/{id}/complete:
 *   patch:
 *     summary: Site Inspector completes the inspection with final findings and material/labor estimates
 *     tags: [Inspections]
 */
router.patch(
  '/:id/complete',
  requirePermission(PERMISSIONS.INSPECTIONS_SUBMIT),
  validate(submitInspectionSchema),
  asyncHandler(controller.submitInspection),
);

/**
 * @openapi
 * /inspections/{id}/details:
 *   patch:
 *     summary: Site Inspector saves incremental findings (measurements/notes/estimates) while on-site
 *     tags: [Inspections]
 */
router.patch(
  '/:id/details',
  requirePermission(PERMISSIONS.INSPECTIONS_SUBMIT),
  validate(updateInspectionDetailsSchema),
  asyncHandler(controller.updateInspectionDetails),
);

/**
 * @openapi
 * /inspections/{id}/photos/upload-url:
 *   post:
 *     summary: Mint a signed Supabase Storage upload URL for an inspection photo
 *     tags: [Inspections]
 */
router.post(
  '/:id/photos/upload-url',
  requirePermission(PERMISSIONS.INSPECTIONS_SUBMIT),
  validate(requestInspectionPhotoUploadUrlSchema),
  asyncHandler(controller.requestPhotoUploadUrl),
);

/**
 * @openapi
 * /inspections/{id}/photos:
 *   post:
 *     summary: Record an inspection photo after it's been uploaded to storage
 *     tags: [Inspections]
 */
router.post(
  '/:id/photos',
  requirePermission(PERMISSIONS.INSPECTIONS_SUBMIT),
  validate(addInspectionPhotoSchema),
  asyncHandler(controller.addPhoto),
);

/**
 * @openapi
 * /inspections/{id}/pdf:
 *   get:
 *     summary: Print/download the Site Inspection report as a PDF
 *     tags: [Inspections]
 */
router.get(
  '/:id/pdf',
  requirePermission(PERMISSIONS.INSPECTIONS_SUBMIT, PERMISSIONS.INSPECTIONS_MANAGE),
  validate(inspectionIdParamsSchema),
  asyncHandler(controller.downloadInspectionPdf),
);

router.get('/:id', requirePermission(PERMISSIONS.INSPECTIONS_SUBMIT, PERMISSIONS.INSPECTIONS_MANAGE), validate(inspectionIdParamsSchema), asyncHandler(controller.getInspection));

router.use(requirePermission(PERMISSIONS.INSPECTIONS_MANAGE));

/**
 * @openapi
 * /inspections:
 *   post:
 *     summary: Register (schedule) a Site Inspection (FR-INSP-01)
 *     tags: [Inspections]
 */
router.post('/', validate(scheduleInspectionSchema), asyncHandler(controller.scheduleInspection));

/**
 * @openapi
 * /inspections:
 *   get:
 *     summary: List Site Inspections — filterable by search/status/inspector/customer/project/date
 *     tags: [Inspections]
 */
router.get('/', validate(listInspectionsSchema), asyncHandler(controller.listInspections));

/**
 * @openapi
 * /inspections/{id}:
 *   patch:
 *     summary: Update, reschedule, submit (draft -> scheduled), or cancel a Site Inspection (FR-INSP-07)
 *     tags: [Inspections]
 */
router.patch('/:id', validate(rescheduleInspectionSchema), asyncHandler(controller.reschedule));

/**
 * @openapi
 * /inspections/{id}:
 *   delete:
 *     summary: Delete a Site Inspection (blocked once a Quotation has been built from it)
 *     tags: [Inspections]
 */
router.delete('/:id', validate(inspectionIdParamsSchema), asyncHandler(controller.deleteInspection));

export default router;

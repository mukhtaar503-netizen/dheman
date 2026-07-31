import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth, requireRole } from '@/middleware/auth';
import { requirePermission } from '@/middleware/permission';
import { PERMISSIONS } from '@/config/permissions';
import * as controller from './quotations.controller';
import {
  createQuotationSchema,
  listQuotationsSchema,
  quotationIdParamsSchema,
  respondQuotationSchema,
  reviseQuotationSchema,
  updateQuotationSchema,
  updateQuotationStatusSchema,
} from './quotations.schema';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /quotations/me:
 *   get:
 *     summary: Customer views their own Quotations (FR-QUOTE-07)
 *     tags: [Quotations]
 */
router.get('/me', requireRole(Role.CUSTOMER), validate(listQuotationsSchema), asyncHandler(controller.listOwnQuotations));

/**
 * @openapi
 * /quotations/{id}/respond:
 *   post:
 *     summary: Customer approves or rejects a Quotation (FR-QUOTE-07)
 *     tags: [Quotations]
 */
router.post('/:id/respond', requireRole(Role.CUSTOMER), validate(respondQuotationSchema), asyncHandler(controller.respondToQuotation));

/**
 * @openapi
 * /quotations/me/{id}/pdf:
 *   get:
 *     summary: Customer downloads the PDF for their own Quotation
 *     tags: [Quotations]
 */
router.get('/me/:id/pdf', requireRole(Role.CUSTOMER), validate(quotationIdParamsSchema), asyncHandler(controller.downloadOwnPdf));

/**
 * @openapi
 * /quotations/inspector/me:
 *   get:
 *     summary: Site Inspector views Quotations tied to inspections they performed (view-only)
 *     tags: [Quotations]
 */
router.get('/inspector/me', requireRole(Role.SITE_INSPECTOR), asyncHandler(controller.listInspectorQuotations));

router.use(requirePermission(PERMISSIONS.QUOTATIONS_MANAGE));

/**
 * @openapi
 * /quotations/statistics:
 *   get:
 *     summary: Quotation dashboard statistics (totals by status, revenue, approval rate, monthly trend)
 *     tags: [Quotations]
 */
router.get('/statistics', asyncHandler(controller.getStatistics));

/**
 * @openapi
 * /quotations/prefill/{siteInspectionId}:
 *   get:
 *     summary: Auto-load customer/service/inspection details and suggested cost items from a completed Site Inspection
 *     tags: [Quotations]
 */
router.get('/prefill/:siteInspectionId', asyncHandler(controller.getPrefill));

router.get('/:id', validate(quotationIdParamsSchema), asyncHandler(controller.getQuotation));

/**
 * @openapi
 * /quotations:
 *   post:
 *     summary: Create a Quotation from a Service Request / Site Inspection (FR-QUOTE-01, FR-QUOTE-02)
 *     tags: [Quotations]
 */
router.post('/', validate(createQuotationSchema), asyncHandler(controller.createQuotation));

/**
 * @openapi
 * /quotations:
 *   get:
 *     summary: List Quotations, filterable by status/customer/date range/amount range, searchable, sortable
 *     tags: [Quotations]
 */
router.get('/', validate(listQuotationsSchema), asyncHandler(controller.listQuotations));

/**
 * @openapi
 * /quotations/{id}:
 *   patch:
 *     summary: Update a Draft Quotation's details — status changes go through /status
 *     tags: [Quotations]
 */
router.patch('/:id', validate(updateQuotationSchema), asyncHandler(controller.updateQuotation));

/**
 * @openapi
 * /quotations/{id}/status:
 *   patch:
 *     summary: Change a Quotation's status following the DRAFT->SENT->APPROVED/REJECTED/EXPIRED(/CANCELLED) transition table
 *     tags: [Quotations]
 */
router.patch('/:id/status', validate(updateQuotationStatusSchema), asyncHandler(controller.updateQuotationStatus));

/**
 * @openapi
 * /quotations/{id}:
 *   delete:
 *     summary: Delete a Quotation — Draft only
 *     tags: [Quotations]
 */
router.delete('/:id', validate(quotationIdParamsSchema), asyncHandler(controller.deleteQuotation));

/**
 * @openapi
 * /quotations/{id}/revise:
 *   post:
 *     summary: Create a new version of a Quotation (FR-QUOTE-04, BR-QUOTE-01)
 *     tags: [Quotations]
 */
router.post('/:id/revise', validate(reviseQuotationSchema), asyncHandler(controller.reviseQuotation));

/**
 * @openapi
 * /quotations/{id}/approve-discount:
 *   post:
 *     summary: Approve a discount above the configured threshold (BR-QUOTE-02) — Admin/Super Admin only
 *     tags: [Quotations]
 */
router.post('/:id/approve-discount', requirePermission(PERMISSIONS.QUOTATIONS_APPROVE_DISCOUNT), asyncHandler(controller.approveDiscount));

/**
 * @openapi
 * /quotations/{id}/send:
 *   post:
 *     summary: Send a Quotation to the Customer (FR-QUOTE-06)
 *     tags: [Quotations]
 */
router.post('/:id/send', asyncHandler(controller.sendQuotation));

/**
 * @openapi
 * /quotations/{id}/pdf:
 *   get:
 *     summary: Staff downloads/prints the Quotation PDF
 *     tags: [Quotations]
 */
router.get('/:id/pdf', validate(quotationIdParamsSchema), asyncHandler(controller.downloadPdf));

/**
 * @openapi
 * /quotations/{id}/email:
 *   post:
 *     summary: Email the Quotation PDF to the customer
 *     tags: [Quotations]
 */
router.post('/:id/email', validate(quotationIdParamsSchema), asyncHandler(controller.emailQuotation));

export default router;

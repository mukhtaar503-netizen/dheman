import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth, requireRole } from '@/middleware/auth';
import * as controller from './quotations.controller';
import { createQuotationSchema, respondQuotationSchema, reviseQuotationSchema } from './quotations.schema';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /quotations/me:
 *   get:
 *     summary: Customer views their own Quotations (FR-QUOTE-07)
 *     tags: [Quotations]
 */
router.get('/me', requireRole(Role.CUSTOMER), asyncHandler(controller.listOwnQuotations));

/**
 * @openapi
 * /quotations/{id}/respond:
 *   post:
 *     summary: Customer approves or rejects a Quotation (FR-QUOTE-07)
 *     tags: [Quotations]
 */
router.post('/:id/respond', requireRole(Role.CUSTOMER), validate(respondQuotationSchema), asyncHandler(controller.respondToQuotation));

router.get('/:id', asyncHandler(controller.getQuotation));

router.use(requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER));

/**
 * @openapi
 * /quotations:
 *   post:
 *     summary: Create a Quotation from a Service Request (FR-QUOTE-01, FR-QUOTE-02)
 *     tags: [Quotations]
 */
router.post('/', validate(createQuotationSchema), asyncHandler(controller.createQuotation));

/**
 * @openapi
 * /quotations:
 *   get:
 *     summary: List Quotations
 *     tags: [Quotations]
 */
router.get('/', asyncHandler(controller.listQuotations));

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
router.post('/:id/approve-discount', requireRole(Role.SUPER_ADMIN, Role.ADMIN), asyncHandler(controller.approveDiscount));

/**
 * @openapi
 * /quotations/{id}/send:
 *   post:
 *     summary: Send a Quotation to the Customer (FR-QUOTE-06)
 *     tags: [Quotations]
 */
router.post('/:id/send', asyncHandler(controller.sendQuotation));

export default router;

import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth, requireRole } from '@/middleware/auth';
import * as controller from './invoices.controller';
import { createInvoiceSchema, listInvoicesSchema, voidInvoiceSchema } from './invoices.schema';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /invoices/me:
 *   get:
 *     summary: Customer views their own Invoices (FR-INV-07)
 *     tags: [Invoices]
 */
router.get('/me', requireRole(Role.CUSTOMER), asyncHandler(controller.listOwnInvoices));

router.get('/:id', asyncHandler(controller.getInvoice));

router.use(requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT));

/**
 * @openapi
 * /invoices:
 *   post:
 *     summary: Generate an Invoice from a Project (FR-INV-01, FR-INV-02, BR-INV-01, BR-INV-02)
 *     tags: [Invoices]
 */
router.post('/', validate(createInvoiceSchema), asyncHandler(controller.createInvoice));

/**
 * @openapi
 * /invoices:
 *   get:
 *     summary: List Invoices (FR-INV-04)
 *     tags: [Invoices]
 */
router.get('/', validate(listInvoicesSchema), asyncHandler(controller.listInvoices));

/**
 * @openapi
 * /invoices/{id}/send:
 *   post:
 *     summary: Send an Invoice to the Customer (FR-INV-06)
 *     tags: [Invoices]
 */
router.post('/:id/send', asyncHandler(controller.sendInvoice));

/**
 * @openapi
 * /invoices/{id}/void:
 *   post:
 *     summary: Void/cancel an Invoice with a mandatory reason (FR-INV-08, BR-INV-03)
 *     tags: [Invoices]
 */
router.post('/:id/void', validate(voidInvoiceSchema), asyncHandler(controller.voidInvoice));

export default router;

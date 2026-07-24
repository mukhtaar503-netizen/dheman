import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth, requireRole } from '@/middleware/auth';
import * as controller from './payments.controller';
import { recordPaymentSchema, reversePaymentSchema } from './payments.schema';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /payments/me:
 *   get:
 *     summary: Customer views their own Payment history (FR-PAY-07)
 *     tags: [Payments]
 */
router.get('/me', requireRole(Role.CUSTOMER), asyncHandler(controller.listOwnPayments));

router.use(requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT));

/**
 * @openapi
 * /payments:
 *   post:
 *     summary: Record a Payment against an Invoice (FR-PAY-01, FR-PAY-02, BR-PAY-01)
 *     tags: [Payments]
 */
router.post('/', validate(recordPaymentSchema), asyncHandler(controller.recordPayment));

/**
 * @openapi
 * /payments:
 *   get:
 *     summary: List Payments, optionally filtered by Invoice (FR-PAY-04)
 *     tags: [Payments]
 */
router.get('/', asyncHandler(controller.listPayments));

router.get('/:id', asyncHandler(controller.getPayment));

/**
 * @openapi
 * /payments/{id}/reverse:
 *   post:
 *     summary: Reverse a Payment — never deletes, restores the Invoice balance (BR-PAY-02)
 *     tags: [Payments]
 */
router.post('/:id/reverse', validate(reversePaymentSchema), asyncHandler(controller.reversePayment));

export default router;

import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '@/utils/async-handler';
import { requireAuth, requireRole } from '@/middleware/auth';
import * as controller from './reports.controller';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /reports/dashboard:
 *   get:
 *     summary: Role-specific dashboard summary widgets (Section 8.2)
 *     tags: [Reports]
 */
router.get('/dashboard', asyncHandler(controller.dashboard));

router.use(requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.PROJECT_MANAGER));

/**
 * @openapi
 * /reports/revenue:
 *   get:
 *     summary: Revenue Report, bucketed by day or month, CSV-exportable (FR-REP-01, FR-REP-06)
 *     tags: [Reports]
 */
router.get('/revenue', asyncHandler(controller.revenue));

/**
 * @openapi
 * /reports/profitability:
 *   get:
 *     summary: Project Profitability Report (FR-REP-02)
 *     tags: [Reports]
 */
router.get('/profitability', asyncHandler(controller.profitability));

/**
 * @openapi
 * /reports/technician-productivity:
 *   get:
 *     summary: Technician Productivity Report (FR-REP-03)
 *     tags: [Reports]
 */
router.get('/technician-productivity', asyncHandler(controller.technicianProductivity));

/**
 * @openapi
 * /reports/receivables:
 *   get:
 *     summary: Outstanding Receivables Report, aged by days overdue (FR-REP-04)
 *     tags: [Reports]
 */
router.get('/receivables', asyncHandler(controller.receivables));

/**
 * @openapi
 * /reports/quotation-conversion:
 *   get:
 *     summary: Quotation Conversion Report (FR-REP-05)
 *     tags: [Reports]
 */
router.get('/quotation-conversion', asyncHandler(controller.quotationConversion));

/**
 * @openapi
 * /reports/customer-satisfaction:
 *   get:
 *     summary: Customer Satisfaction Report (FR-REP-07)
 *     tags: [Reports]
 */
router.get('/customer-satisfaction', asyncHandler(controller.customerSatisfaction));

export default router;

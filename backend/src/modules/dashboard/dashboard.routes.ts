import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth, requireRole } from '@/middleware/auth';
import * as controller from './dashboard.controller';
import { pagedQuerySchema, paymentsQuerySchema, rangeQuerySchema, seriesQuerySchema } from './dashboard.schema';

const router = Router();

// Internal ERP dashboard — Customers use the simpler /reports/dashboard summary instead.
const INTERNAL = [Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.SUPERVISOR, Role.SITE_INSPECTOR, Role.TECHNICIAN, Role.ACCOUNTANT] as const;
const FINANCE = [Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.ACCOUNTANT] as const;

router.use(requireAuth, requireRole(...INTERNAL));

/**
 * @openapi
 * /dashboard/summary:
 *   get:
 *     summary: KPI cards + performance metrics, role-scoped (Dashboard Overview / Performance Metrics)
 *     tags: [Dashboard]
 */
router.get('/summary', validate(rangeQuerySchema), asyncHandler(controller.summary));

/**
 * @openapi
 * /dashboard/projects:
 *   get:
 *     summary: Project Statistics — Bar Chart series, grouped by status
 *     tags: [Dashboard]
 */
router.get('/projects', validate(rangeQuerySchema), asyncHandler(controller.projects));

/**
 * @openapi
 * /dashboard/services:
 *   get:
 *     summary: Service Distribution — Pie Chart
 *     tags: [Dashboard]
 */
router.get('/services', asyncHandler(controller.services));

router.use(requireRole(...FINANCE));

/**
 * @openapi
 * /dashboard/revenue:
 *   get:
 *     summary: Revenue Analytics — Area Chart series
 *     tags: [Dashboard]
 */
router.get('/revenue', validate(seriesQuerySchema), asyncHandler(controller.revenue));

/**
 * @openapi
 * /dashboard/expenses:
 *   get:
 *     summary: Expense Analysis — Line Chart series by category
 *     tags: [Dashboard]
 */
router.get('/expenses', validate(seriesQuerySchema), asyncHandler(controller.expenses));

/**
 * @openapi
 * /dashboard/activity:
 *   get:
 *     summary: Recent Activity — unified timeline (logins, customers, quotations, projects, payments)
 *     tags: [Dashboard]
 */
router.get('/activity', validate(pagedQuerySchema), asyncHandler(controller.activity));

/**
 * @openapi
 * /dashboard/customers:
 *   get:
 *     summary: Recently registered Customers, paginated
 *     tags: [Dashboard]
 */
router.get('/customers', validate(pagedQuerySchema), asyncHandler(controller.customers));

/**
 * @openapi
 * /dashboard/payments:
 *   get:
 *     summary: Recent Payments, paginated/sortable/searchable
 *     tags: [Dashboard]
 */
router.get('/payments', validate(paymentsQuerySchema), asyncHandler(controller.payments));

/**
 * @openapi
 * /dashboard/login-activity:
 *   get:
 *     summary: Login Activity feed — Super Admin only
 *     tags: [Dashboard]
 */
router.get('/login-activity', requireRole(Role.SUPER_ADMIN), validate(pagedQuerySchema), asyncHandler(controller.loginActivity));

export default router;

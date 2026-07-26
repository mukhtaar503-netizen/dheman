import { Router } from 'express';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth } from '@/middleware/auth';
import { requirePermission } from '@/middleware/permission';
import { PERMISSIONS } from '@/config/permissions';
import * as controller from './expenses.controller';
import { createExpenseSchema, decideExpenseSchema, listExpensesSchema } from './expenses.schema';

const router = Router();
router.use(requireAuth, requirePermission(PERMISSIONS.EXPENSES_SUBMIT));

/**
 * @openapi
 * /expenses:
 *   post:
 *     summary: Submit a Project or general operating expense (FR-EXP-01, FR-EXP-02)
 *     tags: [Expenses]
 */
router.post('/', validate(createExpenseSchema), asyncHandler(controller.createExpense));

/**
 * @openapi
 * /expenses:
 *   get:
 *     summary: List Expenses
 *     tags: [Expenses]
 */
router.get('/', validate(listExpensesSchema), asyncHandler(controller.listExpenses));

router.get('/:id', asyncHandler(controller.getExpense));

/**
 * @openapi
 * /expenses/{id}/decide:
 *   post:
 *     summary: Approve or reject an Expense (FR-EXP-03, BR-EXP-01, BR-EXP-02) — Accountant/Admin only
 *     tags: [Expenses]
 */
router.post('/:id/decide', requirePermission(PERMISSIONS.EXPENSES_APPROVE), validate(decideExpenseSchema), asyncHandler(controller.decideExpense));

export default router;

import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth, requireRole } from '@/middleware/auth';
import * as customersController from './customers.controller';
import * as customersService from './customers.service';
import {
  addCustomerNoteSchema,
  addSiteAddressSchema,
  createCustomerSchema,
  listCustomersSchema,
  updateCustomerSchema,
} from './customers.schema';

const router = Router();
const STAFF = [Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER] as const;

router.use(requireAuth);

/**
 * @openapi
 * /customers/me:
 *   get:
 *     summary: Get the logged-in Customer's own profile (FR-CUST-08)
 *     tags: [Customers]
 */
router.get(
  '/me',
  requireRole(Role.CUSTOMER),
  asyncHandler(async (req, res) => {
    const customer = await customersService.getCustomerByUserId(req.user!.id);
    res.status(200).json(await customersService.getCustomerById(customer.id));
  }),
);

/**
 * @openapi
 * /customers/me:
 *   patch:
 *     summary: Update the logged-in Customer's own profile (FR-CUST-08)
 *     tags: [Customers]
 */
router.patch(
  '/me',
  requireRole(Role.CUSTOMER),
  asyncHandler(async (req, res) => {
    const customer = await customersService.getCustomerByUserId(req.user!.id);
    res.status(200).json(await customersService.updateCustomer(req.user, customer.id, req.body));
  }),
);

router.use(requireRole(...STAFF));

/**
 * @openapi
 * /customers:
 *   post:
 *     summary: Create a Customer record (FR-CUST-01)
 *     tags: [Customers]
 */
router.post('/', validate(createCustomerSchema), asyncHandler(customersController.createCustomer));

/**
 * @openapi
 * /customers:
 *   get:
 *     summary: List/search Customers (FR-CUST-01)
 *     tags: [Customers]
 */
router.get('/', validate(listCustomersSchema), asyncHandler(customersController.listCustomers));

/**
 * @openapi
 * /customers/{id}:
 *   get:
 *     summary: Get a Customer with full history (FR-CUST-03)
 *     tags: [Customers]
 */
router.get('/:id', asyncHandler(customersController.getCustomer));

/**
 * @openapi
 * /customers/{id}:
 *   patch:
 *     summary: Update a Customer record
 *     tags: [Customers]
 */
router.patch('/:id', validate(updateCustomerSchema), asyncHandler(customersController.updateCustomer));

/**
 * @openapi
 * /customers/{id}/deactivate:
 *   post:
 *     summary: Deactivate (soft-delete) a Customer (FR-CUST-07, BR-CUST-01)
 *     tags: [Customers]
 */
router.post('/:id/deactivate', requireRole(Role.SUPER_ADMIN, Role.ADMIN), asyncHandler(customersController.deactivateCustomer));

/**
 * @openapi
 * /customers/{id}/site-addresses:
 *   post:
 *     summary: Add a site address to a Customer
 *     tags: [Customers]
 */
router.post('/:id/site-addresses', validate(addSiteAddressSchema), asyncHandler(customersController.addSiteAddress));

/**
 * @openapi
 * /customers/{id}/notes:
 *   post:
 *     summary: Log a communication note against a Customer (FR-CUST-06)
 *     tags: [Customers]
 */
router.post('/:id/notes', validate(addCustomerNoteSchema), asyncHandler(customersController.addNote));

export default router;

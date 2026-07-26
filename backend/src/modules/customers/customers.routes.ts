import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Role } from '@prisma/client';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth, requireRole } from '@/middleware/auth';
import { requirePermission } from '@/middleware/permission';
import { PERMISSIONS } from '@/config/permissions';
import * as customersController from './customers.controller';
import * as customersService from './customers.service';
import {
  addContactSchema,
  addCustomerNoteSchema,
  addDocumentSchema,
  addSiteAddressSchema,
  bulkIdsSchema,
  bulkUpdateStatusSchema,
  createCustomerSchema,
  documentParamsSchema,
  listCustomersSchema,
  renameDocumentSchema,
  requestDocumentUploadUrlSchema,
  updateContactSchema,
  updateCustomerNoteSchema,
  updateCustomerSchema,
  updateSiteAddressSchema,
} from './customers.schema';

const router = Router();

// Generous but bounded — protects the search/export endpoints from scraping/abuse
// without affecting normal interactive use (a customer list page fires a handful
// of requests per minute at most, not hundreds).
const searchLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });
const exportLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

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

/**
 * @openapi
 * /customers/statistics:
 *   get:
 *     summary: Dashboard statistics — totals, top customers, monthly registrations
 *     tags: [Customers]
 */
router.get('/statistics', requirePermission(PERMISSIONS.CUSTOMERS_STATISTICS_VIEW), asyncHandler(customersController.getStatistics));

/**
 * @openapi
 * /customers/export:
 *   get:
 *     summary: Bulk export customers matching the given filters as CSV
 *     tags: [Customers]
 */
router.get(
  '/export',
  exportLimiter,
  requirePermission(PERMISSIONS.CUSTOMERS_EXPORT),
  validate(listCustomersSchema),
  asyncHandler(customersController.exportCustomers),
);

/**
 * @openapi
 * /customers/search:
 *   get:
 *     summary: Search customers (alias of GET /customers; same filters/sort/pagination)
 *     tags: [Customers]
 */
router.get(
  '/search',
  searchLimiter,
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  validate(listCustomersSchema),
  asyncHandler(customersController.listCustomers),
);

/**
 * @openapi
 * /customers:
 *   get:
 *     summary: List/search Customers (FR-CUST-01) — Accountant gets read-only access (R7)
 *     tags: [Customers]
 */
router.get(
  '/',
  searchLimiter,
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  validate(listCustomersSchema),
  asyncHandler(customersController.listCustomers),
);

/**
 * @openapi
 * /customers:
 *   post:
 *     summary: Create a Customer record (FR-CUST-01)
 *     tags: [Customers]
 */
router.post(
  '/',
  requirePermission(PERMISSIONS.CUSTOMERS_MANAGE),
  validate(createCustomerSchema),
  asyncHandler(customersController.createCustomer),
);

/**
 * @openapi
 * /customers/bulk/status:
 *   post:
 *     summary: Bulk-update status for multiple Customers
 *     tags: [Customers]
 */
router.post(
  '/bulk/status',
  requirePermission(PERMISSIONS.CUSTOMERS_MANAGE),
  validate(bulkUpdateStatusSchema),
  asyncHandler(customersController.bulkUpdateStatus),
);

/**
 * @openapi
 * /customers/bulk/delete:
 *   post:
 *     summary: Bulk soft-delete multiple Customers
 *     tags: [Customers]
 */
router.post(
  '/bulk/delete',
  requirePermission(PERMISSIONS.CUSTOMERS_DELETE),
  validate(bulkIdsSchema),
  asyncHandler(customersController.bulkSoftDelete),
);

/**
 * @openapi
 * /customers/bulk/restore:
 *   post:
 *     summary: Bulk-restore multiple soft-deleted Customers
 *     tags: [Customers]
 */
router.post(
  '/bulk/restore',
  requirePermission(PERMISSIONS.CUSTOMERS_DELETE),
  validate(bulkIdsSchema),
  asyncHandler(customersController.bulkRestore),
);

/**
 * @openapi
 * /customers/{id}:
 *   get:
 *     summary: Get a Customer with full history (FR-CUST-03) — Accountant gets read-only access (R7)
 *     tags: [Customers]
 */
router.get('/:id', requirePermission(PERMISSIONS.CUSTOMERS_READ), asyncHandler(customersController.getCustomer));

/**
 * @openapi
 * /customers/{id}/projects:
 *   get:
 *     summary: Get a Customer's current/completed/cancelled Projects
 *     tags: [Customers]
 */
router.get(
  '/:id/projects',
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  asyncHandler(async (req, res) => {
    const customer = await customersService.getCustomerById(req.params.id);
    res.status(200).json({
      current: customer.projectsCurrent,
      completed: customer.projectsCompleted,
      cancelled: customer.projectsCancelled,
    });
  }),
);

/**
 * @openapi
 * /customers/{id}/payments:
 *   get:
 *     summary: Get a Customer's payment history with running balance
 *     tags: [Customers]
 */
router.get(
  '/:id/payments',
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  asyncHandler(async (req, res) => {
    const customer = await customersService.getCustomerById(req.params.id);
    res.status(200).json({ payments: customer.paymentTimeline, stats: customer.stats });
  }),
);

/**
 * @openapi
 * /customers/{id}/documents:
 *   get:
 *     summary: Get a Customer's documents
 *     tags: [Customers]
 */
router.get(
  '/:id/documents',
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  asyncHandler(async (req, res) => {
    const customer = await customersService.getCustomerById(req.params.id);
    res.status(200).json(customer.documents);
  }),
);

/**
 * @openapi
 * /customers/{id}/documents/{documentId}/versions:
 *   get:
 *     summary: Get a document's version history chain
 *     tags: [Customers]
 */
router.get(
  '/:id/documents/:documentId/versions',
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  validate(documentParamsSchema),
  asyncHandler(customersController.getDocumentVersionHistory),
);

/**
 * @openapi
 * /customers/{id}:
 *   patch:
 *     summary: Update a Customer record
 *     tags: [Customers]
 */
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.CUSTOMERS_MANAGE),
  validate(updateCustomerSchema),
  asyncHandler(customersController.updateCustomer),
);

/**
 * @openapi
 * /customers/{id}/deactivate:
 *   post:
 *     summary: Deactivate a Customer (FR-CUST-07, BR-CUST-01)
 *     tags: [Customers]
 */
router.post(
  '/:id/deactivate',
  requirePermission(PERMISSIONS.CUSTOMERS_DEACTIVATE),
  asyncHandler(customersController.deactivateCustomer),
);

/**
 * @openapi
 * /customers/{id}:
 *   delete:
 *     summary: Soft-delete a Customer (recoverable via /restore)
 *     tags: [Customers]
 */
router.delete('/:id', requirePermission(PERMISSIONS.CUSTOMERS_DELETE), asyncHandler(customersController.softDeleteCustomer));

/**
 * @openapi
 * /customers/{id}/restore:
 *   post:
 *     summary: Restore a soft-deleted Customer
 *     tags: [Customers]
 */
router.post('/:id/restore', requirePermission(PERMISSIONS.CUSTOMERS_DELETE), asyncHandler(customersController.restoreCustomer));

/**
 * @openapi
 * /customers/{id}/site-addresses:
 *   post:
 *     summary: Add a site address to a Customer
 *     tags: [Customers]
 */
router.post(
  '/:id/site-addresses',
  requirePermission(PERMISSIONS.CUSTOMERS_MANAGE),
  validate(addSiteAddressSchema),
  asyncHandler(customersController.addSiteAddress),
);

/**
 * @openapi
 * /customers/{id}/site-addresses/{addressId}:
 *   patch:
 *     summary: Update a Customer site address
 *     tags: [Customers]
 */
router.patch(
  '/:id/site-addresses/:addressId',
  requirePermission(PERMISSIONS.CUSTOMERS_MANAGE),
  validate(updateSiteAddressSchema),
  asyncHandler(customersController.updateSiteAddress),
);

/**
 * @openapi
 * /customers/{id}/site-addresses/{addressId}:
 *   delete:
 *     summary: Remove a Customer site address
 *     tags: [Customers]
 */
router.delete(
  '/:id/site-addresses/:addressId',
  requirePermission(PERMISSIONS.CUSTOMERS_MANAGE),
  asyncHandler(customersController.deleteSiteAddress),
);

/**
 * @openapi
 * /customers/{id}/contacts:
 *   post:
 *     summary: Add a contact person to a Customer
 *     tags: [Customers]
 */
router.post(
  '/:id/contacts',
  requirePermission(PERMISSIONS.CUSTOMERS_MANAGE),
  validate(addContactSchema),
  asyncHandler(customersController.addContact),
);

/**
 * @openapi
 * /customers/{id}/contacts/{contactId}:
 *   patch:
 *     summary: Update a Customer contact
 *     tags: [Customers]
 */
router.patch(
  '/:id/contacts/:contactId',
  requirePermission(PERMISSIONS.CUSTOMERS_MANAGE),
  validate(updateContactSchema),
  asyncHandler(customersController.updateContact),
);

/**
 * @openapi
 * /customers/{id}/contacts/{contactId}:
 *   delete:
 *     summary: Remove a Customer contact
 *     tags: [Customers]
 */
router.delete(
  '/:id/contacts/:contactId',
  requirePermission(PERMISSIONS.CUSTOMERS_MANAGE),
  asyncHandler(customersController.deleteContact),
);

/**
 * @openapi
 * /customers/{id}/notes:
 *   post:
 *     summary: Log a note against a Customer — supports pinning and visibility (FR-CUST-06)
 *     tags: [Customers]
 */
router.post(
  '/:id/notes',
  requirePermission(PERMISSIONS.CUSTOMERS_MANAGE),
  validate(addCustomerNoteSchema),
  asyncHandler(customersController.addNote),
);

/**
 * @openapi
 * /customers/{id}/notes/{noteId}:
 *   patch:
 *     summary: Edit or pin/unpin a Customer note
 *     tags: [Customers]
 */
router.patch(
  '/:id/notes/:noteId',
  requirePermission(PERMISSIONS.CUSTOMERS_MANAGE),
  validate(updateCustomerNoteSchema),
  asyncHandler(customersController.updateNote),
);

/**
 * @openapi
 * /customers/{id}/notes/{noteId}:
 *   delete:
 *     summary: Delete a Customer note
 *     tags: [Customers]
 */
router.delete('/:id/notes/:noteId', requirePermission(PERMISSIONS.CUSTOMERS_MANAGE), asyncHandler(customersController.deleteNote));

/**
 * @openapi
 * /customers/{id}/documents/upload-url:
 *   post:
 *     summary: Mint a signed Supabase Storage upload URL for a Customer document
 *     tags: [Customers]
 */
router.post(
  '/:id/documents/upload-url',
  requirePermission(PERMISSIONS.CUSTOMERS_MANAGE),
  validate(requestDocumentUploadUrlSchema),
  asyncHandler(customersController.requestDocumentUploadUrl),
);

/**
 * @openapi
 * /customers/{id}/documents:
 *   post:
 *     summary: Record a Customer document after it's been uploaded to storage (supports versioning via replacesId)
 *     tags: [Customers]
 */
router.post(
  '/:id/documents',
  requirePermission(PERMISSIONS.CUSTOMERS_MANAGE),
  validate(addDocumentSchema),
  asyncHandler(customersController.addDocument),
);

/**
 * @openapi
 * /customers/{id}/documents/{documentId}:
 *   patch:
 *     summary: Rename a Customer document
 *     tags: [Customers]
 */
router.patch(
  '/:id/documents/:documentId',
  requirePermission(PERMISSIONS.CUSTOMERS_MANAGE),
  validate(renameDocumentSchema),
  asyncHandler(customersController.renameDocument),
);

/**
 * @openapi
 * /customers/{id}/documents/{documentId}:
 *   delete:
 *     summary: Delete a Customer document
 *     tags: [Customers]
 */
router.delete(
  '/:id/documents/:documentId',
  requirePermission(PERMISSIONS.CUSTOMERS_MANAGE),
  validate(documentParamsSchema),
  asyncHandler(customersController.deleteDocument),
);

export default router;

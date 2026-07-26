import { Router } from 'express';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth } from '@/middleware/auth';
import { requirePermission } from '@/middleware/permission';
import { PERMISSIONS } from '@/config/permissions';
import { listAuditLogsSchema } from './audit.schema';
import * as service from './audit.service';

const router = Router();
router.use(requireAuth, requirePermission(PERMISSIONS.AUDIT_VIEW));

/**
 * @openapi
 * /audit-logs:
 *   get:
 *     summary: System Audit Log viewer — Super Admin only (FR-SET-07, Section 9.13)
 *     tags: [Audit]
 */
router.get('/', validate(listAuditLogsSchema), asyncHandler(async (req, res) => res.status(200).json(await service.listAuditLogs(req.query as any))));

export default router;

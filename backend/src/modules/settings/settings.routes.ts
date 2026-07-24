import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth, requireRole } from '@/middleware/auth';
import { updateSettingsSchema } from './settings.schema';
import * as settingsService from './settings.service';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /settings:
 *   get:
 *     summary: Get Company Settings (FR-SET-01, FR-SET-02)
 *     tags: [Settings]
 */
router.get('/', asyncHandler(async (_req, res) => res.status(200).json(await settingsService.getSettings())));

/**
 * @openapi
 * /settings:
 *   patch:
 *     summary: Update Company Settings — Super Admin only (FR-SET-01, FR-SET-02, FR-SET-06)
 *     tags: [Settings]
 */
router.patch(
  '/',
  requireRole(Role.SUPER_ADMIN),
  validate(updateSettingsSchema),
  asyncHandler(async (req, res) => res.status(200).json(await settingsService.updateSettings(req.user!, req.body))),
);

export default router;

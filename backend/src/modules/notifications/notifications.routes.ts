import { Router } from 'express';
import { asyncHandler } from '@/utils/async-handler';
import { requireAuth } from '@/middleware/auth';
import * as controller from './notifications.controller';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /notifications:
 *   get:
 *     summary: Notification Center — list the logged-in user's notifications (FR-NOTIF-03)
 *     tags: [Notifications]
 */
router.get('/', asyncHandler(controller.list));

router.post('/:id/read', asyncHandler(controller.markRead));
router.post('/read-all', asyncHandler(controller.markAllRead));

export default router;

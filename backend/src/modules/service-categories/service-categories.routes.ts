import { Router } from 'express';
import { requireAuth } from '@/middleware/auth';

// TODO(Phase): full service-categories module — placeholder until its phase is implemented.
const router = Router();
router.use(requireAuth);

export default router;

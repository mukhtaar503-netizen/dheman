import { Router } from 'express';
import { requireAuth } from '@/middleware/auth';

// TODO(Phase): full quotations module — placeholder until its phase is implemented.
const router = Router();
router.use(requireAuth);

export default router;

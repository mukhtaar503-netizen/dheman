import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { requireAuth } from '@/middleware/auth';
import * as authController from './auth.controller';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerCustomerSchema,
  resetPasswordSchema,
  revokeSessionSchema,
} from './auth.schema';

const router = Router();

// FR-AUTH-07: throttle auth endpoints to slow brute-force attempts.
const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20, standardHeaders: true, legacyHeaders: false });

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Self-register a new Customer account (FR-AUTH-08)
 *     tags: [Auth]
 */
router.post('/register', authLimiter, validate(registerCustomerSchema), asyncHandler(authController.register));

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in and receive an access + refresh token pair (FR-AUTH-01, FR-AUTH-02)
 *     tags: [Auth]
 */
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(authController.login));

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Rotate a refresh token for a new access/refresh pair (FR-AUTH-03)
 *     tags: [Auth]
 */
router.post('/refresh', validate(refreshSchema), asyncHandler(authController.refresh));

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Revoke the active refresh token (FR-AUTH-04)
 *     tags: [Auth]
 */
router.post('/logout', validate(refreshSchema), asyncHandler(authController.logout));

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset email (FR-AUTH-06)
 *     tags: [Auth]
 */
router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using a valid reset token (FR-AUTH-06)
 *     tags: [Auth]
 */
router.post('/reset-password', validate(resetPasswordSchema), asyncHandler(authController.resetPassword));

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get the currently authenticated user
 *     tags: [Auth]
 */
router.get('/me', requireAuth, asyncHandler(authController.me));

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     summary: Change the logged-in user's password (requires current password); revokes all sessions
 *     tags: [Auth]
 */
router.post('/change-password', requireAuth, validate(changePasswordSchema), asyncHandler(authController.changePassword));

/**
 * @openapi
 * /auth/sessions:
 *   get:
 *     summary: List the logged-in user's active sessions (Session Management)
 *     tags: [Auth]
 */
router.get('/sessions', requireAuth, asyncHandler(authController.listSessions));

/**
 * @openapi
 * /auth/sessions:
 *   delete:
 *     summary: Revoke every active session for the logged-in user (log out everywhere)
 *     tags: [Auth]
 */
router.delete('/sessions', requireAuth, asyncHandler(authController.revokeAllSessions));

/**
 * @openapi
 * /auth/sessions/{id}:
 *   delete:
 *     summary: Revoke a single session by ID (Session Management)
 *     tags: [Auth]
 */
router.delete('/sessions/:id', requireAuth, validate(revokeSessionSchema), asyncHandler(authController.revokeSession));

export default router;

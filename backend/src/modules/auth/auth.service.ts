import crypto from 'crypto';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { env } from '@/config/env';
import { HttpError } from '@/utils/http-error';
import { hashPassword, verifyPassword } from '@/utils/password';
import { generateRefreshToken, hashToken, signAccessToken } from '@/utils/tokens';
import { recordAudit } from '@/utils/audit';
import { LoginInput, RegisterCustomerInput } from './auth.schema';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

async function issueTokenPair(userId: string, role: Role, email: string) {
  const accessToken = signAccessToken({ sub: userId, role, email });
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + env.jwt.refreshExpiresInMs),
    },
  });

  return { accessToken, refreshToken };
}

export async function registerCustomer(input: RegisterCustomerInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw HttpError.conflict('An account with this email already exists');

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone,
      role: Role.CUSTOMER,
    },
  });

  await prisma.customer.create({
    data: {
      userId: user.id,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
    },
  });

  const tokens = await issueTokenPair(user.id, user.role, user.email);
  return { user: sanitizeUser(user), ...tokens };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw HttpError.unauthorized('Invalid email or password');

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw HttpError.forbidden('Account is temporarily locked due to repeated failed login attempts');
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const lockedUntil =
      attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null;
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: attempts, lockedUntil },
    });
    throw HttpError.unauthorized('Invalid email or password');
  }

  if (user.status !== 'ACTIVE') {
    throw HttpError.forbidden('Account is not active');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  // Powers the dashboard's Login Activity feed (GET /dashboard/login-activity).
  await recordAudit({ actorId: user.id, action: 'LOGIN', entityType: 'User', entityId: user.id });

  const tokens = await issueTokenPair(user.id, user.role, user.email);
  return { user: sanitizeUser(user), ...tokens };
}

export async function refreshTokens(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw HttpError.unauthorized('Invalid or expired refresh token');
  }

  // Rotation: revoke the used token, issue a fresh pair.
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

  return issueTokenPair(stored.user.id, stored.user.role, stored.user.email);
}

export async function logout(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always behave the same way whether or not the account exists, to avoid user enumeration.
  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString('hex');
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60 * 60_000),
    },
  });

  // TODO: dispatch via the Notifications module (email) once configured — see FR-AUTH-06.
  return rawToken;
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw HttpError.badRequest('Invalid or expired reset token');
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

function sanitizeUser<T extends { passwordHash: string }>(user: T) {
  const { passwordHash: _omit, ...rest } = user;
  return rest;
}

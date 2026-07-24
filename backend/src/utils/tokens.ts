import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '@/config/env';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  email: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: jwt.SignOptions = { expiresIn: env.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, env.jwt.accessSecret, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

/** Opaque, high-entropy refresh token. Only its SHA-256 hash is persisted. */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

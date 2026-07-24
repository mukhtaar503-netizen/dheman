import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { HttpError } from '@/utils/http-error';
import { verifyAccessToken } from '@/utils/tokens';

export interface AuthUser {
  id: string;
  role: Role;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(HttpError.unauthorized('Missing bearer token'));
  }

  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length));
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch {
    next(HttpError.unauthorized('Invalid or expired access token'));
  }
}

/** RBAC gate — restricts an endpoint to the listed roles. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(HttpError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(HttpError.forbidden(`Role ${req.user.role} is not permitted to perform this action`));
    }
    next();
  };
}

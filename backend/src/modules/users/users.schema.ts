import { z } from 'zod';
import { Role, UserStatus } from '@prisma/client';

const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/)
  .regex(/\d/)
  .regex(/[^A-Za-z0-9]/);

// Only Super Admin/Admin may create users, and only Super Admin may create another Super Admin —
// that additional check is enforced in the service layer (R1/R2 restrictions in the PRD).
export const createUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    employeeId: z.string().min(1).optional(),
    department: z.string().optional(),
    password: passwordSchema,
    role: z.nativeEnum(Role),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).optional(),
    phone: z.string().optional(),
    employeeId: z.string().min(1).optional(),
    department: z.string().optional(),
    status: z.nativeEnum(UserStatus).optional(),
    role: z.nativeEnum(Role).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const updateOwnProfileSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).optional(),
    phone: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const listUsersSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    role: z.nativeEnum(Role).optional(),
    status: z.nativeEnum(UserStatus).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  params: z.object({}).optional(),
});

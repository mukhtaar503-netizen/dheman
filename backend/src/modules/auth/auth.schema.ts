import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/\d/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

export const registerCustomerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(6),
    password: passwordSchema,
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(10),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const forgotPasswordSchema = z.object({
  body: z.object({ email: z.string().email() }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const resetPasswordSchema = z.object({
  body: z.object({ token: z.string().min(10), password: passwordSchema }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const changePasswordSchema = z.object({
  body: z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const revokeSessionSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export type RegisterCustomerInput = z.infer<typeof registerCustomerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];

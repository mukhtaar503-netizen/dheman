import { z } from 'zod';

export const createRoleSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    description: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const setRolePermissionsSchema = z.object({
  body: z.object({
    permissionKeys: z.array(z.string()),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const assignRoleSchema = z.object({
  body: z.object({ roleId: z.string().uuid() }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const removeRoleSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid(), roleId: z.string().uuid() }),
});

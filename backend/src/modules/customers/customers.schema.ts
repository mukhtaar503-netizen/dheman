import { z } from 'zod';
import { CustomerStatus, CustomerType } from '@prisma/client';

export const createCustomerSchema = z.object({
  body: z.object({
    type: z.nativeEnum(CustomerType).default(CustomerType.INDIVIDUAL),
    fullName: z.string().min(2),
    companyName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().min(6),
    billingAddress: z.string().optional(),
    tags: z.array(z.string()).optional(),
    siteAddresses: z
      .array(z.object({ label: z.string(), addressLine: z.string(), city: z.string().optional() }))
      .optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateCustomerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).optional(),
    companyName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().min(6).optional(),
    billingAddress: z.string().optional(),
    status: z.nativeEnum(CustomerStatus).optional(),
    tags: z.array(z.string()).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const addSiteAddressSchema = z.object({
  body: z.object({ label: z.string(), addressLine: z.string(), city: z.string().optional(), notes: z.string().optional() }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const addCustomerNoteSchema = z.object({
  body: z.object({ note: z.string().min(1) }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const listCustomersSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    search: z.string().optional(),
    status: z.nativeEnum(CustomerStatus).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  params: z.object({}).optional(),
});

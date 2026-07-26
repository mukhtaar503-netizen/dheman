import { z } from 'zod';
import {
  CustomerDocumentCategory,
  CustomerNoteVisibility,
  CustomerSource,
  CustomerStatus,
  CustomerType,
  Gender,
  PreferredContactMethod,
} from '@prisma/client';

const addressInputSchema = z.object({
  label: z.string().min(1),
  addressLine: z.string().min(1),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  street: z.string().optional(),
  building: z.string().optional(),
  postalCode: z.string().optional(),
  landmark: z.string().optional(),
  mapLocation: z.string().optional(),
  isDefault: z.boolean().optional(),
  notes: z.string().optional(),
});

const contactInputSchema = z.object({
  name: z.string().min(1),
  position: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  isPrimary: z.boolean().optional(),
});

export const createCustomerSchema = z.object({
  query: z.object({ allowDuplicate: z.coerce.boolean().optional() }).optional(),
  body: z.object({
    type: z.nativeEnum(CustomerType).default(CustomerType.INDIVIDUAL),
    fullName: z.string().min(2),
    companyName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().min(6),
    alternatePhone: z.string().optional(),
    nationalId: z.string().optional(),
    gender: z.nativeEnum(Gender).optional(),
    dateOfBirth: z.coerce.date().optional(),
    preferredContactMethod: z.nativeEnum(PreferredContactMethod).default(PreferredContactMethod.PHONE),
    source: z.nativeEnum(CustomerSource).default(CustomerSource.OTHER),
    billingAddress: z.string().optional(),
    status: z.nativeEnum(CustomerStatus).optional(),
    tags: z.array(z.string()).optional(),
    assignedTechnicianId: z.string().uuid().optional(),
    siteAddresses: z.array(addressInputSchema).optional(),
    contacts: z.array(contactInputSchema).optional(),
  }),
  params: z.object({}).optional(),
});

export const updateCustomerSchema = z.object({
  body: z.object({
    type: z.nativeEnum(CustomerType).optional(),
    fullName: z.string().min(2).optional(),
    companyName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().min(6).optional(),
    alternatePhone: z.string().optional(),
    nationalId: z.string().optional(),
    gender: z.nativeEnum(Gender).optional(),
    dateOfBirth: z.coerce.date().optional(),
    preferredContactMethod: z.nativeEnum(PreferredContactMethod).optional(),
    source: z.nativeEnum(CustomerSource).optional(),
    billingAddress: z.string().optional(),
    status: z.nativeEnum(CustomerStatus).optional(),
    tags: z.array(z.string()).optional(),
    assignedTechnicianId: z.string().uuid().nullable().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

const sortOptions = ['newest', 'oldest', 'alphabetical', 'most_projects', 'highest_revenue'] as const;

export const listCustomersSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    search: z.string().optional(),
    type: z.nativeEnum(CustomerType).optional(),
    status: z.nativeEnum(CustomerStatus).optional(),
    city: z.string().optional(),
    source: z.nativeEnum(CustomerSource).optional(),
    assignedTechnicianId: z.string().uuid().optional(),
    registeredFrom: z.coerce.date().optional(),
    registeredTo: z.coerce.date().optional(),
    hasActiveProjects: z.coerce.boolean().optional(),
    hasCompletedProjects: z.coerce.boolean().optional(),
    minOutstandingBalance: z.coerce.number().min(0).optional(),
    includeDeleted: z.coerce.boolean().default(false),
    sort: z.enum(sortOptions).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  params: z.object({}).optional(),
});

export const bulkIdsSchema = z.object({
  body: z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const bulkUpdateStatusSchema = z.object({
  body: z.object({ ids: z.array(z.string().uuid()).min(1).max(500), status: z.nativeEnum(CustomerStatus) }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const addSiteAddressSchema = z.object({
  body: addressInputSchema,
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const updateSiteAddressSchema = z.object({
  body: addressInputSchema.partial(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid(), addressId: z.string().uuid() }),
});

export const addContactSchema = z.object({
  body: contactInputSchema,
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const updateContactSchema = z.object({
  body: contactInputSchema.partial(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid(), contactId: z.string().uuid() }),
});

export const addCustomerNoteSchema = z.object({
  body: z.object({
    note: z.string().min(1),
    visibility: z.nativeEnum(CustomerNoteVisibility).default(CustomerNoteVisibility.INTERNAL),
    isPinned: z.boolean().optional(),
    attachments: z.array(z.string()).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const updateCustomerNoteSchema = z.object({
  body: z.object({
    note: z.string().min(1).optional(),
    visibility: z.nativeEnum(CustomerNoteVisibility).optional(),
    isPinned: z.boolean().optional(),
    attachments: z.array(z.string()).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid(), noteId: z.string().uuid() }),
});

export const requestDocumentUploadUrlSchema = z.object({
  body: z.object({
    fileName: z.string().min(1),
    mimeType: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const addDocumentSchema = z.object({
  body: z.object({
    category: z.nativeEnum(CustomerDocumentCategory).default(CustomerDocumentCategory.OTHER),
    fileName: z.string().min(1),
    fileUrl: z.string().min(1),
    fileSize: z.number().int().positive().max(10 * 1024 * 1024).optional(),
    mimeType: z.string().optional(),
    replacesId: z.string().uuid().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const renameDocumentSchema = z.object({
  body: z.object({ fileName: z.string().min(1) }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid(), documentId: z.string().uuid() }),
});

export const documentParamsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid(), documentId: z.string().uuid() }),
});

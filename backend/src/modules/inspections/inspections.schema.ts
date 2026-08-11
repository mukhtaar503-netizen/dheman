import { z } from 'zod';
import { AttachmentType } from '@prisma/client';

const registrationFieldsSchema = {
  siteAddress: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  estimatedWorkers: z.number().int().min(0).optional(),
  estimatedWorkingDays: z.number().int().min(0).optional(),
  specialSkillsRequired: z.string().optional(),
  vehicleRequired: z.string().optional(),
  transportDistance: z.number().min(0).optional(),
  accessibility: z.string().optional(),
  transportationNotes: z.string().optional(),
};

const measurementSchema = z.object({
  label: z.string(),
  length: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  unit: z.string().optional(),
  quantity: z.number().int().min(0).optional(),
  area: z.number().optional(),
  notes: z.string().optional(),
});

const materialEstimateSchema = z.array(
  z.object({
    material: z.string(),
    quantity: z.string(),
    unit: z.string().optional(),
    estimatedCost: z.number().min(0).optional(),
    remarks: z.string().optional(),
  }),
);
const laborEstimateSchema = z.array(z.object({ task: z.string(), estimatedHours: z.number().min(0), cost: z.number().min(0) }));

export const scheduleInspectionSchema = z.object({
  body: z.object({
    serviceRequestId: z.string().uuid(),
    inspectorId: z.string().uuid(),
    scheduledAt: z.coerce.date(),
    status: z.enum(['PENDING', 'SCHEDULED']).optional(),
    measurements: z.array(measurementSchema).optional(),
    materialEstimate: materialEstimateSchema.optional(),
    ...registrationFieldsSchema,
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

/** "Update Inspection" — also how "Submit Inspection" advances a PENDING draft (status: SCHEDULED). */
export const rescheduleInspectionSchema = z.object({
  body: z.object({
    scheduledAt: z.coerce.date().optional(),
    inspectorId: z.string().uuid().optional(),
    cancelReason: z.string().optional(),
    status: z.enum(['PENDING', 'SCHEDULED']).optional(),
    measurements: z.array(measurementSchema).optional(),
    materialEstimate: materialEstimateSchema.optional(),
    ...registrationFieldsSchema,
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

/** Incremental findings capture, while the inspection is SCHEDULED/IN_PROGRESS. */
export const updateInspectionDetailsSchema = z.object({
  body: z.object({
    accessNotes: z.string().optional(),
    measurements: z.array(measurementSchema).optional(),
    materialEstimate: materialEstimateSchema.optional(),
    laborEstimate: laborEstimateSchema.optional(),
    transportationCost: z.number().min(0).optional(),
    estimatedCost: z.number().min(0).optional(),
    estimatedDuration: z.string().optional(),
    ...registrationFieldsSchema,
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const submitInspectionSchema = z.object({
  body: z.object({
    accessNotes: z.string().optional(),
    checklistItems: z.array(z.object({ key: z.string(), label: z.string(), value: z.any().optional() })).optional(),
    measurements: z.array(measurementSchema).optional(),
    materialEstimate: materialEstimateSchema.optional(),
    laborEstimate: laborEstimateSchema.optional(),
    transportationCost: z.number().min(0).optional(),
    estimatedCost: z.number().min(0).optional(),
    estimatedDuration: z.string().optional(),
    photos: z.array(z.object({ fileUrl: z.string().url(), caption: z.string().optional(), fileType: z.nativeEnum(AttachmentType).optional() })).optional(),
    ...registrationFieldsSchema,
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const inspectionIdParamsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const listInspectionsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    search: z.string().optional(),
    status: z.enum(['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    inspectorId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    serviceRequestId: z.string().uuid().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  params: z.object({}).optional(),
});

export const requestInspectionPhotoUploadUrlSchema = z.object({
  body: z.object({
    fileName: z.string().min(1),
    mimeType: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const addInspectionPhotoSchema = z.object({
  body: z.object({
    fileUrl: z.string().min(1),
    caption: z.string().optional(),
    fileType: z.nativeEnum(AttachmentType).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

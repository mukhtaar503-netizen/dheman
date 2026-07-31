import { z } from 'zod';

export const scheduleInspectionSchema = z.object({
  body: z.object({
    serviceRequestId: z.string().uuid(),
    inspectorId: z.string().uuid(),
    scheduledAt: z.coerce.date(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const rescheduleInspectionSchema = z.object({
  body: z.object({
    scheduledAt: z.coerce.date().optional(),
    inspectorId: z.string().uuid().optional(),
    cancelReason: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

const measurementSchema = z.object({
  label: z.string(),
  length: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  unit: z.string().optional(),
  area: z.number().optional(),
});

const materialEstimateSchema = z.array(z.object({ material: z.string(), quantity: z.string(), estimatedCost: z.number().min(0) }));
const laborEstimateSchema = z.array(z.object({ task: z.string(), estimatedHours: z.number().min(0), cost: z.number().min(0) }));

/** Incremental findings capture, while the inspection is SCHEDULED/IN_PROGRESS. */
export const updateInspectionDetailsSchema = z.object({
  body: z.object({
    accessNotes: z.string().optional(),
    technicalNotes: z.string().optional(),
    measurements: z.array(measurementSchema).optional(),
    materialEstimate: materialEstimateSchema.optional(),
    laborEstimate: laborEstimateSchema.optional(),
    estimatedCost: z.number().min(0).optional(),
    estimatedDuration: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const submitInspectionSchema = z.object({
  body: z.object({
    accessNotes: z.string().optional(),
    technicalNotes: z.string().optional(),
    checklistItems: z.array(z.object({ key: z.string(), label: z.string(), value: z.any().optional() })).optional(),
    measurements: z.array(measurementSchema).optional(),
    materialEstimate: materialEstimateSchema.optional(),
    laborEstimate: laborEstimateSchema.optional(),
    estimatedCost: z.number().min(0).optional(),
    estimatedDuration: z.string().optional(),
    photos: z.array(z.object({ fileUrl: z.string().url(), caption: z.string().optional() })).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const inspectionIdParamsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
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
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

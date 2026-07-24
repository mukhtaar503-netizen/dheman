import { z } from 'zod';

export const updateSettingsSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    logoUrl: z.string().url().optional(),
    address: z.string().optional(),
    taxRegistrationNo: z.string().optional(),
    taxRatePercent: z.number().min(0).max(100).optional(),
    currency: z.string().length(3).optional(),
    quotationValidityDays: z.number().int().min(1).optional(),
    discountApprovalThreshold: z.number().min(0).max(100).optional(),
    expenseApprovalThreshold: z.number().min(0).optional(),
    invoiceDueDays: z.number().int().min(1).optional(),
    numberingConfig: z.record(z.any()).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

import { z } from 'zod';

export const listAuditLogsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    entityType: z.string().optional(),
    actorId: z.string().uuid().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  params: z.object({}).optional(),
});

import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { HttpError } from '@/utils/http-error';

/** Validates req.body/query/params against a Zod schema, replacing them with parsed values. */
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({ body: req.body, query: req.query, params: req.params });
      if (parsed.body) req.body = parsed.body;
      if (parsed.query) req.query = parsed.query;
      if (parsed.params) req.params = parsed.params;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(HttpError.badRequest('Validation failed', err.flatten()));
      }
      next(err);
    }
  };
}

import { z } from 'zod';

export function multipartJson<T extends z.ZodType>(schema: T) {
  return z.preprocess((value, ctx) => {
    if (value === undefined || value === '') {
      return undefined;
    }
    if (typeof value !== 'string') {
      return value;
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
      ctx.addIssue({ code: 'custom', message: 'Invalid JSON' });
      return z.NEVER;
    }
  }, schema.optional());
}

export const MultipartBooleanSchema = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean().optional());

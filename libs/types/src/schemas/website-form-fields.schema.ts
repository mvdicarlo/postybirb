import { z } from 'zod';
import type { IWebsiteFormFields } from '../models/submission/website-form-fields.interface';
import { DescriptionValueSchema } from './description.schema';

export const WebsiteFormFieldsSchema = z.looseObject({
  title: z.string().optional(),
  tags: z
    .looseObject({
      overrideDefault: z.boolean(),
      tags: z.array(z.string()),
    })
    .optional(),
  description: DescriptionValueSchema.optional(),
  rating: z.string().optional(),
  contentWarning: z.string().optional(),
  // Rating can have custom values while ZodType requires it to be default enum type
}) satisfies z.ZodType<
  Omit<IWebsiteFormFields, 'rating'>
> as z.ZodType<IWebsiteFormFields>;

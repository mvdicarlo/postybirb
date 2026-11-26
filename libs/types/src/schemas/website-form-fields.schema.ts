import { z, ZodEnum } from 'zod';
import { SubmissionRating } from '../enums/submission-rating.enum';
import type { IWebsiteFormFields } from '../models/submission/website-form-fields.interface';
import { DescriptionValueSchema } from './description.schema';

export const WebsiteFormFieldsSchema: z.ZodType<IWebsiteFormFields> =
  z.looseObject({
    title: z.string().optional(),
    tags: z
      .looseObject({
        overrideDefault: z.boolean(),
        tags: z.array(z.string()),
      })
      .optional(),
    description: DescriptionValueSchema.optional(),
    // Rating can have custom values while ZodType requires it to be default enum type
    rating: z.string().optional() as unknown as ZodEnum<
      typeof SubmissionRating
    >,
    contentWarning: z.string().optional(),
  });

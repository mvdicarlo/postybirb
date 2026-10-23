import { z } from 'zod';
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
    rating: z.enum(SubmissionRating).optional(),
    contentWarning: z.string().optional(),
  });

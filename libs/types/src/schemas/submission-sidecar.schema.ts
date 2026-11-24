import { z } from 'zod';
import { SubmissionRating } from '../enums/submission-rating.enum';

export const SubmissionSidecarSchema = z.looseObject({
  rating: z
    .preprocess(
      (value) => (typeof value === 'string' ? value.toUpperCase() : value),
      z.nativeEnum(SubmissionRating),
    )
    .optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type SubmissionSidecar = z.infer<typeof SubmissionSidecarSchema>;

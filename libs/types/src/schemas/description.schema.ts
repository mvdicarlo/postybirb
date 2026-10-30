import { z } from 'zod';
import type {
  Description,
  DescriptionValue,
  TipTapNode,
} from '../models/submission/description-value.type';

export const TipTapNodeSchema: z.ZodType<TipTapNode> = z.lazy(() =>
  z.looseObject({
    type: z.string(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(TipTapNodeSchema).optional(),
    marks: z
      .array(
        z.looseObject({
          type: z.string(),
          attrs: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .optional(),
    text: z.string().optional(),
  }),
);

export const DescriptionSchema: z.ZodType<Description> = z.looseObject({
  type: z.literal('doc'),
  content: z.array(TipTapNodeSchema),
});

export const DescriptionValueSchema: z.ZodType<DescriptionValue> =
  z.looseObject({
    overrideDefault: z.boolean(),
    insertTags: z.boolean().optional(),
    insertTitle: z.boolean().optional(),
    description: DescriptionSchema,
    version: z
      .object({
        revision: z.number().int().nonnegative(),
        mutationId: z.string().uuid().nullable(),
        replacementRevision: z.number().int().nonnegative(),
      })
      .optional(),
  });

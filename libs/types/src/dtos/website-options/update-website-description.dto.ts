import { z } from 'zod';
import { DescriptionValueSchema } from '../../schemas/description.schema';
import { createZodDto } from '../zod-dto';

export const UpdateWebsiteDescriptionSchema = z.object({
  value: DescriptionValueSchema,
  expectedRevision: z.number().int().nonnegative(),
  mutationId: z.string().uuid(),
});

export const DESCRIPTION_REVISION_CONFLICT = 'DESCRIPTION_REVISION_CONFLICT';

/** Saves only the description, rejecting stale revisions without changing other fields. */
export class UpdateWebsiteDescriptionDto extends createZodDto(
  UpdateWebsiteDescriptionSchema,
) {}

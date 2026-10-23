import { z } from 'zod';
import { createZodDto } from '../zod-dto';

export const UpdateSubmissionTemplateNameSchema = z.object({
  name: z.string(),
});

export class UpdateSubmissionTemplateNameDto extends createZodDto(
  UpdateSubmissionTemplateNameSchema,
) {}

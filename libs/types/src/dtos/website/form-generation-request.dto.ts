import { z } from 'zod';
import { createZodDto } from '../zod-dto';
import { SubmissionType } from '../../enums/submission-type.enum';

export const FormGenerationRequestSchema = z.object({
  accountId: z.string(),
  type: z.enum(SubmissionType),
  isMultiSubmission: z.boolean().optional(),
});

export class FormGenerationRequestDto extends createZodDto(
  FormGenerationRequestSchema,
) {}

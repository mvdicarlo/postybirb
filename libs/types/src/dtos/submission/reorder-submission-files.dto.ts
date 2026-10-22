import { z } from 'zod';
import { createZodDto } from '../zod-dto';

export const ReorderSubmissionFilesSchema = z.object({
  order: z.record(z.string(), z.number()),
});

export class ReorderSubmissionFilesDto extends createZodDto(
  ReorderSubmissionFilesSchema,
) {}

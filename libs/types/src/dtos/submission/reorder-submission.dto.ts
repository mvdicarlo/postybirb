import { z } from 'zod';
import { createZodDto } from '../zod-dto';

export const ReorderSubmissionSchema = z.object({
  id: z.string().describe('The ID of the submission to move'),
  targetId: z
    .string()
    .describe('The ID of the target submission to position relative to'),
  position: z.enum(['before', 'after']),
});

export class ReorderSubmissionDto extends createZodDto(
  ReorderSubmissionSchema,
) {}

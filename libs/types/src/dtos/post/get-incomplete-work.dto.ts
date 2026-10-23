import { z } from 'zod';
import { createZodDto } from '../zod-dto';

export const GetIncompleteWorkSchema = z.object({
  submissionId: z.string(),
  evictions: z.record(z.string(), z.array(z.string())),
  targets: z
    .record(z.string(), z.array(z.string()))
    .optional()
    .describe(
      'Only post these accounts/files, including previously successful targets. An empty file list selects all eligible files for that account.',
    ),
});

export class GetIncompleteWorkDto extends createZodDto(
  GetIncompleteWorkSchema,
) {}

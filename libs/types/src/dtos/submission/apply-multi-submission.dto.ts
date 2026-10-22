import { z } from 'zod';
import { createZodDto } from '../zod-dto';

export const ApplyMultiSubmissionSchema = z.object({
  submissionToApply: z.string().min(1),
  submissionIds: z.array(z.string()),
  merge: z
    .boolean()
    .describe(
      'Overwrite overlapping options while preserving unique options when true; replace all options when false',
    ),
});

export class ApplyMultiSubmissionDto extends createZodDto(
  ApplyMultiSubmissionSchema,
) {}

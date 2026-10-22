import { z } from 'zod';
import { createZodDto } from '../zod-dto';
import { PostRecordResumeMode } from '../../enums/post-record-resume-mode.enum';

export const PostQueueActionSchema = z.object({
  submissionIds: z.array(z.string()),
  resumeMode: z.enum(PostRecordResumeMode).optional(),
});

export class PostQueueActionDto extends createZodDto(PostQueueActionSchema) {}

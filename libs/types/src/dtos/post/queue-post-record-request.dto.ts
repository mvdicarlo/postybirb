import { z } from 'zod';
import { createZodDto } from '../zod-dto';

export const QueuePostRecordRequestSchema = z.object({
  ids: z.array(z.string()),
});

export class QueuePostRecordRequestDto extends createZodDto(
  QueuePostRecordRequestSchema,
) {}

import { z } from 'zod';
import { createZodDto } from '../zod-dto';

export const UpdateNotificationSchema = z.object({
  isRead: z.boolean(),
  hasEmitted: z.boolean(),
});

export class UpdateNotificationDto extends createZodDto(
  UpdateNotificationSchema,
) {}

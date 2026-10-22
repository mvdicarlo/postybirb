import { z } from 'zod';
import { createZodDto } from '../zod-dto';

export const CreateNotificationSchema = z.object({
  title: z.string(),
  message: z.string(),
  tags: z.array(z.string()).default([]),
  data: z.record(z.string(), z.unknown()).default({}),
  type: z.enum(['warning', 'error', 'info', 'success']).default('info'),
});

export class CreateNotificationDto extends createZodDto(
  CreateNotificationSchema,
) {
  constructor() {
    super();
    Object.assign(
      this,
      CreateNotificationSchema.pick({
        data: true,
        tags: true,
        type: true,
      }).parse({}),
    );
  }
}

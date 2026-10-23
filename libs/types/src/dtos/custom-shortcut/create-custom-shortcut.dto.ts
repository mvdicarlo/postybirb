import { z } from 'zod';
import { createZodDto } from '../zod-dto';

export const CreateCustomShortcutSchema = z.object({
  name: z.string(),
});

export class CreateCustomShortcutDto extends createZodDto(
  CreateCustomShortcutSchema,
) {}

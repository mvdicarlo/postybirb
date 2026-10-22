import { z } from 'zod';
import { createZodDto } from '../zod-dto';
import { DescriptionSchema } from '../../schemas/description.schema';

export const UpdateCustomShortcutSchema = z.object({
  name: z.string(),
  shortcut: DescriptionSchema,
});

export class UpdateCustomShortcutDto extends createZodDto(
  UpdateCustomShortcutSchema,
) {}

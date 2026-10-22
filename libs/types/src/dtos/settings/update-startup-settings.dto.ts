import { z } from 'zod';
import { createZodDto } from '../zod-dto';

export const UpdateStartupSettingsSchema = z.object({
  appDataPath: z.string().optional(),
  port: z.string().optional(),
  startAppOnSystemStartup: z.boolean().optional(),
  spellchecker: z.boolean().optional(),
});

export class UpdateStartupSettingsDto extends createZodDto(
  UpdateStartupSettingsSchema,
) {}

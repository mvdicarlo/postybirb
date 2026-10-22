import { z } from 'zod';
import { createZodDto } from '../zod-dto';

export const LegacyImportSchema = z.object({
  customShortcuts: z.boolean(),
  tagGroups: z.boolean(),
  accounts: z.boolean(),
  tagConverters: z.boolean(),
  submissions: z.boolean(),
  templates: z.boolean(),
  customPath: z.string().optional(),
});

export class LegacyImportDto extends createZodDto(LegacyImportSchema) {}

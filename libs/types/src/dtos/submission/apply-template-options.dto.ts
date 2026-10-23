import { z } from 'zod';
import { createZodDto } from '../zod-dto';
import { TemplateOptionSchema } from './template-option.dto';

export const ApplyTemplateOptionsSchema = z.object({
  targetSubmissionIds: z.array(z.string()),
  options: z.array(TemplateOptionSchema),
  overrideTitle: z.boolean(),
  overrideDescription: z.boolean(),
});

export class ApplyTemplateOptionsDto extends createZodDto(
  ApplyTemplateOptionsSchema,
) {}

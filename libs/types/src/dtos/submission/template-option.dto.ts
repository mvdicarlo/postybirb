import { z } from 'zod';
import { WebsiteFormFieldsSchema } from '../../schemas/website-form-fields.schema';
import { createZodDto } from '../zod-dto';

export const TemplateOptionSchema = z.object({
  accountId: z.string().min(1),
  sourceOptionId: z.string().min(1).optional(),
  data: WebsiteFormFieldsSchema,
});

export class TemplateOptionDto extends createZodDto(TemplateOptionSchema) {}

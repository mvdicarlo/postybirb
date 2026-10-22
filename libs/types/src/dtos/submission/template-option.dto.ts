import { z } from 'zod';
import { createZodDto } from '../zod-dto';
import { WebsiteFormFieldsSchema } from '../../schemas/website-form-fields.schema';

export const TemplateOptionSchema = z.object({
  accountId: z.string().min(1),
  data: WebsiteFormFieldsSchema,
});

export class TemplateOptionDto extends createZodDto(TemplateOptionSchema) {}

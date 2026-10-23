import { z } from 'zod';
import { createZodDto } from '../zod-dto';
import { WebsiteFormFieldsSchema } from '../../schemas/website-form-fields.schema';

export const UpdateWebsiteOptionsSchema = z.object({
  data: WebsiteFormFieldsSchema,
});

export class UpdateWebsiteOptionsDto extends createZodDto(
  UpdateWebsiteOptionsSchema,
) {}

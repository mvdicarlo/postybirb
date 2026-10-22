import { z } from 'zod';
import { createZodDto } from '../zod-dto';
import { WebsiteFormFieldsSchema } from '../../schemas/website-form-fields.schema';

export const CreateWebsiteOptionsSchema = z.object({
  submissionId: z.string(),
  accountId: z.string(),
  data: WebsiteFormFieldsSchema.default({}),
  isDefault: z.boolean().default(false).optional(),
});

export class CreateWebsiteOptionsDto extends createZodDto(
  CreateWebsiteOptionsSchema,
) {
  constructor() {
    super();
    this.isDefault =
      CreateWebsiteOptionsSchema.shape.isDefault.parse(undefined);
  }
}

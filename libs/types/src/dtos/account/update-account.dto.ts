import { z } from 'zod';
import { createZodDto } from '../zod-dto';

export const UpdateAccountSchema = z.object({
  name: z.string(),
  groups: z.array(z.string()),
  defaultFileTemplateId: z.string().nullish(),
  defaultMessageTemplateId: z.string().nullish(),
});

export class UpdateAccountDto extends createZodDto(UpdateAccountSchema) {}

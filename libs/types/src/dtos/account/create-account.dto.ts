import { z } from 'zod';
import { createZodDto } from '../zod-dto';

export const CreateAccountSchema = z.object({
  name: z.string().min(1).max(64),
  website: z.string().min(1),
  groups: z.array(z.string()),
});

export class CreateAccountDto extends createZodDto(CreateAccountSchema) {}

import { z } from 'zod';
import { createZodDto } from '../zod-dto';

export const CreateUserConverterSchema = z.object({
  username: z.string(),
  convertTo: z.record(z.string(), z.string()),
});

export class CreateUserConverterDto extends createZodDto(
  CreateUserConverterSchema,
) {}

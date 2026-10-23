import { z } from 'zod';
import { createZodDto } from '../zod-dto';

export const CreateTagConverterSchema = z.object({
  tag: z.string(),
  convertTo: z.record(z.string(), z.string()),
});

export class CreateTagConverterDto extends createZodDto(
  CreateTagConverterSchema,
) {}

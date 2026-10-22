import { z } from 'zod';
import { createZodDto } from '../zod-dto';

export const CreateTagGroupSchema = z.object({
  name: z.string(),
  tags: z.array(z.string()),
});

export class CreateTagGroupDto extends createZodDto(CreateTagGroupSchema) {}

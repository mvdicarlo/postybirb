import { z } from 'zod';
import { createZodDto } from '../zod-dto';

export const CheckPathSchema = z.object({
  path: z.string().min(1).describe('The directory path to check'),
});

export class CheckPathDto extends createZodDto(CheckPathSchema) {}

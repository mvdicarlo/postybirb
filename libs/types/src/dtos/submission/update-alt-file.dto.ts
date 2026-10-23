import { z } from 'zod';
import { createZodDto } from '../zod-dto';

export const UpdateAltFileSchema = z.object({ text: z.string() });

export class UpdateAltFileDto extends createZodDto(UpdateAltFileSchema) {}

import { createZodDto } from '../zod-dto';
import { CreateTagConverterSchema } from './create-tag-converter.dto';

export const UpdateTagConverterSchema = CreateTagConverterSchema;

export class UpdateTagConverterDto extends createZodDto(
  UpdateTagConverterSchema,
) {}

import { createZodDto } from '../zod-dto';
import { CreateUserConverterSchema } from './create-user-converter.dto';

export const UpdateUserConverterSchema = CreateUserConverterSchema.partial();

export class UpdateUserConverterDto extends createZodDto(
  UpdateUserConverterSchema,
) {}

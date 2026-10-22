import { createZodDto } from '../zod-dto';
import { CreateTagGroupSchema } from './create-tag-group.dto';

export const UpdateTagGroupSchema = CreateTagGroupSchema;

export class UpdateTagGroupDto extends createZodDto(UpdateTagGroupSchema) {}

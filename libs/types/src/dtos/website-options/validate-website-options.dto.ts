import { createZodDto } from '../zod-dto';
import { PreviewDescriptionSchema } from './preview-description.dto';

export const ValidateWebsiteOptionsSchema = PreviewDescriptionSchema;

export class ValidateWebsiteOptionsDto extends createZodDto(
  ValidateWebsiteOptionsSchema,
) {}

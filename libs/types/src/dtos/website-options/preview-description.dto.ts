import { z } from 'zod';
import { createZodDto } from '../zod-dto';
import { DescriptionType } from '../../enums/description-types.enum';

export const PreviewDescriptionSchema = z.object({
  submissionId: z.string(),
  websiteOptionId: z.string(),
});

export class PreviewDescriptionDto extends createZodDto(
  PreviewDescriptionSchema,
) {}

export interface IDescriptionPreviewResult {
  descriptionType: DescriptionType;
  description: string;
}

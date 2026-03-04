import { DescriptionType } from '../../enums/description-types.enum';
import { EntityId, SubmissionId } from '../../models';

export interface IPreviewDescriptionDto {
  submissionId: SubmissionId;
  websiteOptionId: EntityId;
}

export interface IDescriptionPreviewResult {
  descriptionType: DescriptionType;
  description: string;
}

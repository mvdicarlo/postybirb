import { EntityId, SubmissionId } from '../../models';

export interface IValidateWebsiteOptionsDto {
  submission: SubmissionId;
  websiteOptionId: EntityId;
}

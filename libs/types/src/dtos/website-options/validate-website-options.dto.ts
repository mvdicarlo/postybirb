import { EntityId, SubmissionId } from '../../models';

export interface IValidateWebsiteOptionsDto {
  submissionId: SubmissionId;
  websiteOptionId: EntityId;
}

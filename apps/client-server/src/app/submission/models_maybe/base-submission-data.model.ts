import BaseWebsiteOptions from './base-website-options.model';

export default interface BaseSubmissionData<T extends BaseWebsiteOptions> {
  id: string;
  data: T;
  ref: {
    accountId: string;
    submissionId: string;
  };
  website: string;
}

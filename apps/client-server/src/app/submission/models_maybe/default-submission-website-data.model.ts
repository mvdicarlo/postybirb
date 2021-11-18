import SubmissionWebsiteData from './base-submission-data.model';
import BaseWebsiteOptions from './base-website-options.model';

export default interface DefaultSubmissionData
  extends SubmissionWebsiteData<BaseWebsiteOptions> {
  website: 'default';
}

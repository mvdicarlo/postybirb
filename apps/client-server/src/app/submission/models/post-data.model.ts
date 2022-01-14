import SubmissionType from '../enums/submission-type.enum';
import BaseWebsiteOptions from './base-website-options.model';

// TODO need a real model for this when posting happens
type PostData<T extends BaseWebsiteOptions> = {
  type: SubmissionType;
} & T;

export default PostData;

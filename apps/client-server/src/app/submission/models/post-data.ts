import SubmissionType from '../enums/submission-type';
import BaseWebsiteOptions from './base-website-options';

// TODO need a real model for this when posting happens
type PostData<T extends BaseWebsiteOptions> = {
  type: SubmissionType;
} & T;

export default PostData;

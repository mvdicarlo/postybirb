import SubmissionType from '../enums/submission-type';
import { BaseOptions } from './base-website-options';

// TODO need a real model for this when posting happens
type PostData<T extends BaseOptions> = {
  type: SubmissionType;
} & T;

export default PostData;

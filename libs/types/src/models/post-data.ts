import { SubmissionType } from '../enums';
import { BaseWebsiteOptions } from './base-website-options';

// TODO need a real model for this when posting happens
export type PostData<T extends BaseWebsiteOptions> = {
  type: SubmissionType;
} & T;

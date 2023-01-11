import { BaseWebsiteOptions } from './base-website-options';
import { ISubmission } from './submission';

export type PostData<S extends ISubmission, T extends BaseWebsiteOptions> = {
  options: T;
  submission: S;
};

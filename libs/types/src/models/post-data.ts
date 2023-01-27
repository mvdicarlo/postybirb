import { IBaseWebsiteOptions } from './base-website-options';
import { ISubmission } from './submission';

export type PostData<S extends ISubmission, T extends IBaseWebsiteOptions> = {
  options: T;
  submission: S;
};

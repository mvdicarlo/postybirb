import { BaseWebsiteOptions } from '@postybirb/types';

export interface IUpdateSubmissionOptionsDto<T extends BaseWebsiteOptions> {
  id: string;
  data: T;
}

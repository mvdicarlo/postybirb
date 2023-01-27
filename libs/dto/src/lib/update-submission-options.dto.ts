import { IBaseWebsiteOptions } from '@postybirb/types';

export interface IUpdateSubmissionOptionsDto<T extends IBaseWebsiteOptions> {
  id: string;
  data: T;
}

import { BaseWebsiteOptions } from '@postybirb/types';
import { IAccountDto } from './account.dto';

export interface ISubmissionOptionsDto<
  T extends BaseWebsiteOptions = BaseWebsiteOptions
> {
  id: string;
  data: T;
  account?: IAccountDto;
}

import { IWebsitePostRecord } from '../../models';
import { IAccountDto } from '../account/account.dto';
import { IEntityDto } from '../database/entity.dto';

export type WebsitePostRecordDto = Omit<
  IEntityDto<IWebsitePostRecord>,
  'account'
> & {
  account: IAccountDto;
};

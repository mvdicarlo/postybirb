import { IPostEvent } from '../../models';
import { IAccountDto } from '../account/account.dto';
import { IEntityDto } from '../database/entity.dto';

export type PostEventDto = Omit<IEntityDto<IPostEvent>, 'account'> & {
  account?: IAccountDto;
};

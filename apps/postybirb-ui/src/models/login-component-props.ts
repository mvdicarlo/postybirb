import { IAccountDto, IWebsiteInfoDto } from '@postybirb/types';

export type LoginComponentProps<T> = {
  account: IAccountDto<T>;
  website: IWebsiteInfoDto;
};

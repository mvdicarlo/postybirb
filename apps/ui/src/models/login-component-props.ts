import { IAccountDto, IWebsiteLoginInfo } from '@postybirb/dto';

export type LoginComponentProps<T> = {
  account: IAccountDto<T>;
  website: IWebsiteLoginInfo;
};

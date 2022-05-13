import { IAccountDto, IWebsiteLoginInfo } from '@postybirb/dto';

export type LoginComponentProps = {
  account: IAccountDto<unknown>;
  website: IWebsiteLoginInfo;
};

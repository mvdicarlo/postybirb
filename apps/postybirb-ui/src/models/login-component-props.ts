import { IAccountDto, IWebsiteInfoDto } from '@postybirb/dto';

export type LoginComponentProps<T> = {
  account: IAccountDto<T>;
  website: IWebsiteInfoDto;
};

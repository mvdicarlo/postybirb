import { IWebsiteInfoDto } from '@postybirb/dto';

export type DisplayableWebsiteLoginInfo = IWebsiteInfoDto & {
  isHidden: boolean;
};

import { IWebsiteInfoDto } from '@postybirb/types';

export type DisplayableWebsiteLoginInfo = IWebsiteInfoDto & {
  isHidden: boolean;
};

import { IWebsiteLoginInfo } from '@postybirb/dto';

export type DisplayableWebsiteLoginInfo = IWebsiteLoginInfo & {
  isHidden: boolean;
};

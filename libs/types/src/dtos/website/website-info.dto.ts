import { WebsiteId } from '../../models';
import { WebsiteLoginType } from '../../models/website/website-login-type';
import { IWebsiteMetadata } from '../../website-modifiers';
import { IAccountDto } from '../account/account.dto';
import { UsernameShortcut } from './username-shortcut.dto';

export interface IWebsiteInfoDto {
  id: WebsiteId;
  displayName: string;
  loginType: WebsiteLoginType;
  usernameShortcut: UsernameShortcut;
  metadata: IWebsiteMetadata;
  accounts: IAccountDto[];
}

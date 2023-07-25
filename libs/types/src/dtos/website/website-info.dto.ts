import { IWebsiteMetadata } from '@postybirb/website-metadata';
import { UsernameShortcut } from './username-shortcut.dto';
import { WebsiteLoginType } from '../../models/website/website-login-type';
import { WebsiteId } from '../../models';
import { IAccountDto } from '../account/account.dto';

export interface IWebsiteInfoDto {
  id: WebsiteId;
  displayName: string;
  loginType: WebsiteLoginType;
  usernameShortcut: UsernameShortcut;
  metadata: IWebsiteMetadata;
  accounts: IAccountDto[];
}

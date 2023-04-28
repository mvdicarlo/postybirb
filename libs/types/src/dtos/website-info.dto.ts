import { IWebsiteMetadata } from '@postybirb/website-metadata';
import { UsernameShortcut } from './username-shortcut.dto';
import { WebsiteLoginType } from './website-login-type.dto';

export interface IWebsiteInfoDto {
  id: string;
  displayName: string;
  loginType: WebsiteLoginType;
  usernameShortcut: UsernameShortcut;
  metadata: IWebsiteMetadata;
}

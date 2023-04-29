import { IWebsiteMetadata } from '@postybirb/website-metadata';
import { UsernameShortcut } from './username-shortcut.dto';
import { WebsiteLoginType } from '../../models/website/website-login-type';
import { WebsiteId } from '../../models';

export interface IWebsiteInfoDto {
  id: WebsiteId;
  displayName: string;
  loginType: WebsiteLoginType;
  usernameShortcut: UsernameShortcut;
  metadata: IWebsiteMetadata;
}

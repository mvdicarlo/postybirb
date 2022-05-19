import { UsernameShortcut } from './username-shortcut.dto';
import { WebsiteLoginType } from './website-login-type.dto';

export interface IWebsiteLoginInfo {
  id: string;
  displayName: string;
  loginType: WebsiteLoginType;
  usernameShortcut: UsernameShortcut;
}

import { WebsiteId } from '../../models';
import { WebsiteLoginType } from '../../models/website/website-login-type';
import { IWebsiteMetadata, TagSupport } from '../../website-modifiers';
import { UsernameShortcut } from '../../website-modifiers/username-shortcut';
import { IAccountDto } from '../account/account.dto';

export interface IWebsiteInfoDto {
  id: WebsiteId;
  displayName: string;
  loginType: WebsiteLoginType;
  usernameShortcut?: UsernameShortcut;
  metadata: IWebsiteMetadata;
  accounts: IAccountDto[];
  tagSupport: TagSupport;
}

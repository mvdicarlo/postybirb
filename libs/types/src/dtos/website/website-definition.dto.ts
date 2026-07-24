import { WebsiteId } from '../../models';
import { WebsiteLoginType } from '../../models/website/website-login-type';
import {
  IWebsiteMetadata,
  UsernameShortcut,
} from '../../website-modifiers';
import { WebsiteFileOptions } from '../../website-modifiers/website-file-options';

export type UsernameShortcutDto = Pick<UsernameShortcut, 'id' | 'url'>;

export interface IWebsiteDefinitionDto {
  id: WebsiteId;
  displayName: string;
  loginType: WebsiteLoginType;
  usernameShortcut?: UsernameShortcutDto;
  metadata: IWebsiteMetadata;
  fileOptions?: WebsiteFileOptions;
  supportsFile: boolean;
  supportsMessage: boolean;
}
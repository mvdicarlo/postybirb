/**
 * WebsiteRecord - Concrete class for website info data.
 * Note: Does not extend BaseRecord because definitions are static catalog data.
 */

import type {
  IWebsiteDefinitionDto,
  IWebsiteMetadata,
  UsernameShortcutDto,
  WebsiteFileOptions,
  WebsiteId,
  WebsiteLoginType
} from '@postybirb/types';

/**
 * Record class representing a website entity.
 */
export class WebsiteRecord {
  readonly id: WebsiteId;
  readonly displayName: string;
  readonly loginType: WebsiteLoginType;
  readonly usernameShortcut?: UsernameShortcutDto;
  readonly metadata: IWebsiteMetadata;
  readonly fileOptions?: WebsiteFileOptions;
  readonly supportsFile: boolean;
  readonly supportsMessage: boolean;

  constructor(dto: IWebsiteDefinitionDto) {
    this.id = dto.id;
    this.displayName = dto.displayName;
    this.loginType = dto.loginType;
    this.usernameShortcut = dto.usernameShortcut;
    this.metadata = dto.metadata;
    this.fileOptions = dto.fileOptions;
    this.supportsFile = dto.supportsFile;
    this.supportsMessage = dto.supportsMessage;
  }

  /**
   * Check if this record matches the given id.
   */
  matches(id: WebsiteId): boolean {
    return this.id === id;
  }

  /**
   * Check if this website uses user/password login.
   */
  get isUserLogin(): boolean {
    return this.loginType.type === 'user';
  }

  /**
   * Check if this website uses custom login.
   */
  get isCustomLogin(): boolean {
    return this.loginType.type === 'custom';
  }
}

/**
 * AccountRecord - Concrete class for account data.
 */

import type { AccountId, IAccountDto, ILoginState, IWebsiteInfo } from '@postybirb/types';
import { BaseRecord } from './base-record';

/**
 * Record class representing an account entity.
 */
export class AccountRecord extends BaseRecord {
  readonly name: string;
  readonly website: string;
  readonly groups: string[];
  readonly state: ILoginState;
  readonly data: unknown;
  readonly websiteInfo: IWebsiteInfo;
  readonly defaultFileTemplateId: AccountId | null;
  readonly defaultMessageTemplateId: AccountId | null;

  constructor(dto: IAccountDto) {
    super(dto);
    this.name = dto.name;
    this.website = dto.website;
    this.groups = dto.groups ?? [];
    this.state = dto.state;
    this.data = dto.data;
    this.websiteInfo = dto.websiteInfo;
    this.defaultFileTemplateId = dto.defaultFileTemplateId ?? null;
    this.defaultMessageTemplateId = dto.defaultMessageTemplateId ?? null;
  }

  /**
   * Get the account id with proper typing.
   */
  get accountId(): AccountId {
    return this.id as AccountId;
  }

  /**
   * Check if the account is logged in.
   */
  get isLoggedIn(): boolean {
    return this.state.isLoggedIn;
  }

  /**
   * Check if login is pending.
   */
  get isPending(): boolean {
    return this.state.pending;
  }

  /**
   * Get the username if logged in.
   */
  get username(): string | null {
    return this.state.username;
  }

  /**
   * Get the display name for the website.
   */
  get websiteDisplayName(): string {
    return this.websiteInfo.websiteDisplayName;
  }

  /**
   * Check if the account belongs to a specific group.
   */
  hasGroup(group: string): boolean {
    return this.groups.includes(group);
  }
}

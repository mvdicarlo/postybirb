/**
 * WebsiteRecord - Concrete class for website info data.
 * Note: Does not extend BaseRecord as IWebsiteInfoDto lacks createdAt/updatedAt.
 */

import type {
  IAccountDto,
  IWebsiteInfoDto,
  IWebsiteMetadata,
  UsernameShortcut,
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
  readonly usernameShortcut?: UsernameShortcut;
  readonly metadata: IWebsiteMetadata;
  readonly accounts: IAccountDto[];
  readonly fileOptions?: WebsiteFileOptions;
  readonly supportsFile: boolean;
  readonly supportsMessage: boolean;

  // Cached computed value — safe because record data is immutable after construction
  private readonly _loggedInAccounts: IAccountDto[];

  constructor(dto: IWebsiteInfoDto) {
    this.id = dto.id;
    this.displayName = dto.displayName;
    this.loginType = dto.loginType;
    this.usernameShortcut = dto.usernameShortcut;
    this.metadata = dto.metadata;
    this.accounts = dto.accounts;
    this.fileOptions = dto.fileOptions;
    this.supportsFile = dto.supportsFile;
    this.supportsMessage = dto.supportsMessage;

    // Pre-compute filtered accounts
    this._loggedInAccounts = this.accounts.filter(
      (account) => account.state.isLoggedIn
    );
  }

  /**
   * Check if this record matches the given id.
   */
  matches(id: WebsiteId): boolean {
    return this.id === id;
  }

  /**
   * Get the number of accounts for this website.
   */
  get accountCount(): number {
    return this.accounts.length;
  }

  /**
   * Get logged-in accounts for this website.
   */
  get loggedInAccounts(): IAccountDto[] {
    return this._loggedInAccounts;
  }

  /**
   * Get the number of logged-in accounts.
   */
  get loggedInCount(): number {
    return this._loggedInAccounts.length;
  }

  /**
   * Check if any accounts are logged in.
   */
  get hasLoggedInAccounts(): boolean {
    return this.loggedInCount > 0;
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

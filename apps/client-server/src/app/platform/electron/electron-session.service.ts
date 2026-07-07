import { Injectable } from '@nestjs/common';
import {
  PlatformClearStorageOptions,
  PlatformCookie,
  PlatformCookieDetails,
  PlatformCookieFilter,
  PlatformSessionService,
} from '@postybirb/platform';
import { getPartitionKey } from '@postybirb/utils/common';
import { session } from 'electron';

/**
 * Electron-backed implementation of {@link PlatformSessionService}.
 *
 * Uses `session.fromPartition('persist:<id>')` to scope cookies and storage
 * per account.
 */
@Injectable()
export class ElectronSessionService extends PlatformSessionService {
  private getSession(partition: string) {
    return session.fromPartition(getPartitionKey(partition));
  }

  async getCookies(
    partition: string,
    filter: PlatformCookieFilter = {},
  ): Promise<PlatformCookie[]> {
    const cookies = await this.getSession(partition).cookies.get(filter);
    return cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      hostOnly: c.hostOnly,
      path: c.path,
      secure: c.secure,
      httpOnly: c.httpOnly,
      session: c.session,
      expirationDate: c.expirationDate,
      sameSite: c.sameSite,
    }));
  }

  async setCookie(
    partition: string,
    details: PlatformCookieDetails,
  ): Promise<void> {
    await this.getSession(partition).cookies.set(details);
  }

  async removeCookie(
    partition: string,
    url: string,
    name: string,
  ): Promise<void> {
    await this.getSession(partition).cookies.remove(url, name);
  }

  async flushCookies(partition: string): Promise<void> {
    await this.getSession(partition).cookies.flushStore();
  }

  async clearStorageData(
    partition: string,
    options?: PlatformClearStorageOptions,
  ): Promise<void> {
    await this.getSession(partition).clearStorageData(options);
  }
}

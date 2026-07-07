import { Injectable } from '@nestjs/common';
import {
    PlatformCookie,
    PlatformCookieChange,
    PlatformCookieChangeCause,
    PlatformCookieDetails,
    PlatformCookieFilter,
    PlatformSessionService,
} from '@postybirb/platform';
import { getPartitionKey } from '@postybirb/utils/common';
import { Cookie, session } from 'electron';

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

  private static toPlatformCookie(c: Cookie): PlatformCookie {
    return {
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
    };
  }

  async getCookies(
    partition: string,
    filter: PlatformCookieFilter = {},
  ): Promise<PlatformCookie[]> {
    const cookies = await this.getSession(partition).cookies.get(filter);
    return cookies.map((c) => ElectronSessionService.toPlatformCookie(c));
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

  async clearStorageData(partition: string): Promise<void> {
    await this.getSession(partition).clearStorageData();
  }

  onCookieChanged(
    partition: string,
    callback: (change: PlatformCookieChange) => void,
  ): () => void {
    const { cookies } = this.getSession(partition);
    const listener = (
      _event: Electron.Event,
      cookie: Cookie,
      cause: PlatformCookieChangeCause,
      removed: boolean,
    ) => {
      callback({
        cookie: ElectronSessionService.toPlatformCookie(cookie),
        cause,
        removed,
      });
    };
    cookies.on('changed', listener);
    return () => {
      cookies.removeListener('changed', listener);
    };
  }
}

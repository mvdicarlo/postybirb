import { Injectable } from '@nestjs/common';
import { Http } from '@postybirb/http';
import { parseProxyResolution } from '@postybirb/proxy';
import type {
  BinaryPostOptions,
  HttpOptions,
  HttpResponse,
  PostOptions,
} from '@postybirb/http/types';
import {
  PlatformCookie,
  PlatformHttpService,
  PlatformParsedProxy,
} from '@postybirb/platform';
import { session } from 'electron';

/**
 * Electron-backed implementation of {@link PlatformHttpService}.
 *
 * Delegates 1:1 to the static `Http` class from `@postybirb/http`, which
 * uses Electron's `net` module, `BrowserWindow` (for Cloudflare bypass), and
 * `session.fromPartition` for cookies. Proxy resolution is read directly from
 * Electron's default session and parsed locally.
 *
 * Centralizing this delegation here keeps the rest of the application
 * free of direct `@postybirb/http` (and therefore electron) imports.
 */
@Injectable()
export class ElectronHttpService extends PlatformHttpService {
  getUserAgent(appVersion: string): string {
    return Http.getUserAgent(appVersion);
  }

  async getWebsiteCookies(
    partitionId: string,
    url: string,
  ): Promise<PlatformCookie[]> {
    const cookies = await Http.getWebsiteCookies(partitionId, url);
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

  async getParsedProxiesFor(url: string): Promise<PlatformParsedProxy[]> {
    const resolved = await session.defaultSession.resolveProxy(url);
    return parseProxyResolution(resolved);
  }

  get<T>(url: string, options: HttpOptions): Promise<HttpResponse<T>> {
    return Http.get<T>(url, options);
  }

  post<T>(
    url: string,
    options: PostOptions | BinaryPostOptions,
  ): Promise<HttpResponse<T>> {
    return Http.post<T>(url, options);
  }

  patch<T>(url: string, options: PostOptions): Promise<HttpResponse<T>> {
    return Http.patch<T>(url, options);
  }

  put<T>(
    url: string,
    options: PostOptions | BinaryPostOptions,
  ): Promise<HttpResponse<T>> {
    return Http.put<T>(url, options);
  }
}

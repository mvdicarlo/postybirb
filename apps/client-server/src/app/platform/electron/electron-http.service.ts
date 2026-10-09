import { Injectable } from '@nestjs/common';
import { getParsedProxiesFor, Http } from '@postybirb/http';
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

/**
 * Electron-backed implementation of {@link PlatformHttpService}.
 *
 * Delegates 1:1 to the static `Http` class and `getParsedProxiesFor` from
 * `@postybirb/http`, which use Electron's `net` module, `BrowserWindow`
 * (for interactive Cloudflare challenges), and `session.fromPartition` for
 * cookies.
 *
 * Centralizing this delegation here keeps the rest of the application
 * free of direct `@postybirb/http` (and therefore electron) imports.
 */
@Injectable()
export class ElectronHttpService extends PlatformHttpService {
  private openCloudflareWindow = false;

  private cloudflareSettingExpiresAt = 0;

  constructor(
    private readonly shouldOpenCloudflareChallengeWindow: () =>
      | boolean
      | Promise<boolean> = () => false,
  ) {
    super();
  }

  private async getOpenCloudflareWindowSetting(): Promise<boolean> {
    const now = Date.now();
    if (now < this.cloudflareSettingExpiresAt) {
      return this.openCloudflareWindow;
    }

    try {
      this.openCloudflareWindow =
        await this.shouldOpenCloudflareChallengeWindow();
    } catch {
      this.openCloudflareWindow = false;
    }
    this.cloudflareSettingExpiresAt = now + 1000;
    return this.openCloudflareWindow;
  }

  private async withCloudflareChallengeSettings<T extends HttpOptions>(
    options: T,
  ): Promise<T> {
    return {
      ...options,
      cloudflareChallenge: {
        openBrowserWindow:
          options.cloudflareChallenge?.openBrowserWindow ??
          (await this.getOpenCloudflareWindowSetting()),
        timeoutMs: options.cloudflareChallenge?.timeoutMs,
      },
    };
  }

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
    const proxies = await getParsedProxiesFor(url);
    return proxies.filter((p): p is PlatformParsedProxy => Boolean(p));
  }

  async get<T>(url: string, options: HttpOptions): Promise<HttpResponse<T>> {
    return Http.get<T>(
      url,
      await this.withCloudflareChallengeSettings(options),
    );
  }

  async post<T>(
    url: string,
    options: PostOptions | BinaryPostOptions,
  ): Promise<HttpResponse<T>> {
    return Http.post<T>(
      url,
      await this.withCloudflareChallengeSettings(options),
    );
  }

  async patch<T>(url: string, options: PostOptions): Promise<HttpResponse<T>> {
    return Http.patch<T>(
      url,
      await this.withCloudflareChallengeSettings(options),
    );
  }

  async put<T>(
    url: string,
    options: PostOptions | BinaryPostOptions,
  ): Promise<HttpResponse<T>> {
    return Http.put<T>(
      url,
      await this.withCloudflareChallengeSettings(options),
    );
  }
}

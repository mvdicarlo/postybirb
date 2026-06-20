import type {
  BinaryPostOptions,
  HttpOptions,
  PostOptions,
} from '@postybirb/http/types';
import { PlatformHttpService, PlatformService } from '@postybirb/platform';

function withWebsiteId<T extends HttpOptions>(
  options: T,
  websiteId: string,
): T {
  return {
    ...options,
    websiteId: options.websiteId ?? websiteId,
  };
}

function createWebsiteScopedHttp(
  http: PlatformHttpService,
  websiteId: string,
): PlatformHttpService {
  return {
    getUserAgent: (appVersion) => http.getUserAgent(appVersion),
    getWebsiteCookies: (partitionId, url) =>
      http.getWebsiteCookies(partitionId, url),
    getParsedProxiesFor: (url) => http.getParsedProxiesFor(url),
    get: (url, options) => http.get(url, withWebsiteId(options, websiteId)),
    post: (url, options) =>
      http.post(url, withWebsiteId(options, websiteId) as PostOptions | BinaryPostOptions),
    patch: (url, options) =>
      http.patch(url, withWebsiteId(options, websiteId)),
    put: (url, options) =>
      http.put(url, withWebsiteId(options, websiteId) as PostOptions | BinaryPostOptions),
  };
}

/**
 * Binds {@link PlatformService.http} to a website so partition-less requests
 * (e.g. Discord) still resolve the correct proxy profile.
 */
export function createWebsiteScopedPlatform(
  platform: PlatformService,
  websiteId: string,
): PlatformService {
  return {
    app: platform.app,
    session: platform.session,
    browser: platform.browser,
    notification: platform.notification,
    process: platform.process,
    http: createWebsiteScopedHttp(platform.http, websiteId),
  };
}

import type {
  BinaryPostOptions,
  HttpOptions,
  HttpResponse,
  PostOptions,
} from '@postybirb/http/types';
import type { PlatformCookie } from './cookie-types';

export type {
  BinaryPostOptions,
  HttpOptions,
  HttpRequestOptions,
  HttpResponse,
  PostOptions,
} from '@postybirb/http/types';

/**
 * A platform-agnostic representation of a single resolved proxy entry.
 * Mirrors the shape returned by Electron's session proxy resolution so
 * consumers can describe proxy chains without importing electron types.
 */
export interface PlatformParsedProxy {
  type: string;
  hostname: string;
  port: string;
}

/**
 * HTTP capabilities that may be backed by Electron's `net` module
 * (with proxy + cookie partition support and Cloudflare challenge
 * fallback) or by a standard Node fetch implementation.
 *
 * Mirrors the public surface of the static `Http` class in
 * `@postybirb/http` so consumers can be written against the platform
 * abstraction rather than coupling to electron transitively.
 */
export abstract class PlatformHttpService {
  /** Returns the user agent string the platform uses for HTTP requests. */
  abstract getUserAgent(appVersion: string): string;

  /** Returns the cookies stored for `url` under the given account partition. */
  abstract getWebsiteCookies(
    partitionId: string,
    url: string,
  ): Promise<PlatformCookie[]>;

  /** Resolves the proxy chain configured for `url` (DIRECT yields []). */
  abstract getParsedProxiesFor(url: string): Promise<PlatformParsedProxy[]>;

  abstract get<T>(url: string, options: HttpOptions): Promise<HttpResponse<T>>;

  abstract post<T>(
    url: string,
    options: PostOptions | BinaryPostOptions,
  ): Promise<HttpResponse<T>>;

  abstract patch<T>(
    url: string,
    options: PostOptions,
  ): Promise<HttpResponse<T>>;

  abstract put<T>(
    url: string,
    options: PostOptions | BinaryPostOptions,
  ): Promise<HttpResponse<T>>;
}

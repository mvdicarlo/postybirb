/**
 * A platform-agnostic cookie representation. Mirrors the shape of
 * Electron.Cookie but lives here so consumers can describe cookies
 * without importing electron types.
 */
export interface PlatformCookie {
  name: string;
  value: string;
  domain?: string;
  hostOnly?: boolean;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  session?: boolean;
  expirationDate?: number;
  sameSite?: 'unspecified' | 'no_restriction' | 'lax' | 'strict';
}

/**
 * Filter accepted by {@link PlatformSessionService.getCookies}. Mirrors
 * Electron's Cookies.get filter shape.
 */
export interface PlatformCookieFilter {
  url?: string;
  name?: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  session?: boolean;
}

/**
 * Details accepted by {@link PlatformSessionService.setCookie}. Mirrors
 * Electron's Cookies.set details. `url` is required since cookie writes
 * are scoped by URL.
 */
export interface PlatformCookieDetails {
  url: string;
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  expirationDate?: number;
  sameSite?: 'unspecified' | 'no_restriction' | 'lax' | 'strict';
}

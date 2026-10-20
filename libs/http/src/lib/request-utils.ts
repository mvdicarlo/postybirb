import { encode as encodeQueryString } from 'querystring';
import type { HttpOptions } from './types';

export const DEFAULT_REQUEST_TIMEOUT = 60 * 1000;
export const DEFAULT_UPLOAD_TIMEOUT = 15 * 60 * 1000;

export function getRequestUrl(url: string, options: HttpOptions): string {
  if (!options.queryParameters) {
    return url;
  }

  const requestUrl = new URL(url);
  requestUrl.search = new URLSearchParams(
    encodeQueryString(options.queryParameters),
  ).toString();
  return requestUrl.toString();
}

export function createTimeoutError(timeoutMs: number): Error {
  return Object.assign(
    new Error(`HTTP request timed out after ${timeoutMs}ms`),
    {
      name: 'TimeoutError',
    },
  );
}

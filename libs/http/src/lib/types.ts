/**
 * Pure type declarations for the HTTP library.
 *
 * This file MUST NOT import anything that has electron as a dependency
 * (directly or transitively). Anything exported here can be safely consumed
 * by tests, scripts, and non-electron runtimes via the
 * `@postybirb/http/types` entry point.
 */

export interface HttpRequestOptions {
  /** Skips adding index to url encoded data for arrays. */
  skipUrlEncodedIndexing?: boolean;
}

export interface HttpOptions {
  headers?: Record<string, string>;
  queryParameters?: Record<
    string,
    | string
    | number
    | boolean
    | readonly string[]
    | readonly number[]
    | readonly boolean[]
  >;
  partition?: string | undefined;
  options?: HttpRequestOptions;
}

export interface PostOptions extends HttpOptions {
  type: 'multipart' | 'json' | 'urlencoded';
  data: Record<string, unknown>;
  /**
   * When true, sends the request via Electron's BrowserWindow.loadURL
   * with raw data bytes instead of using net.request ClientRequest.
   * Useful for websites that require browser-like form submissions.
   */
  uploadAsRawData?: boolean;
}

export interface BinaryPostOptions extends HttpOptions {
  type: 'binary';
  data: Buffer;
  /**
   * When true, sends the request via Electron's BrowserWindow.loadURL
   * with raw data bytes instead of using net.request ClientRequest.
   */
  uploadAsRawData?: boolean;
}

export interface HttpResponse<T> {
  body: T;
  statusCode: number;
  statusMessage: string;
  responseUrl: string;
}

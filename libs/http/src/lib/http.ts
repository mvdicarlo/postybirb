/* eslint-disable no-console */
import { Logger } from '@nestjs/common';
import { trackDependency, trackException } from '@postybirb/logger';
import {
  BrowserWindow,
  ClientRequest,
  ClientRequestConstructorOptions,
  net,
  session,
} from 'electron';
import FormData from 'form-data';
import urlEncoded from 'form-urlencoded';
import { encode as encodeQueryString } from 'querystring';
import { FormFile } from './form-file';
import {
  BinaryPostOptions,
  CloudflareChallengeOptions,
  HttpOptions,
  HttpResponse,
  PostOptions,
} from './types';

export type {
  BinaryPostOptions,
  CloudflareChallengeOptions,
  HttpOptions,
  HttpRequestOptions,
  HttpResponse,
  PostOptions,
} from './types';

// https://www.electronjs.org/docs/api/client-request#instance-methods
const RESTRICTED_HEADERS: string[] = [
  'Content-Length',
  'Host',
  'Trailer',
  'TE',
  'Upgrade',
  'Cookie2',
  'Keep-Alive',
  'Transfer-Encoding',
];

// Note: Unsure if gzip actually does anything through this method.
// Electron might deflate automatically.
const DEFAULT_HEADERS: Record<string, string> = {
  'Accept-Encoding': 'gzip, deflate, br',
};

interface CreateBodyData {
  contentType: string;
  buffer: Buffer;
}

interface CloudflareAwareHttpResponse<T> extends HttpResponse<T> {
  isCloudflareChallenge: boolean;
}

const DEFAULT_CLOUDFLARE_CHALLENGE_TIMEOUT = 5 * 60 * 1000;

function getPartitionKey(partition: string): string {
  return `persist:${partition}`;
}

function getRequestUrl(url: string, options: HttpOptions): string {
  if (!options.queryParameters) {
    return url;
  }

  const requestUrl = new URL(url);
  requestUrl.search = new URLSearchParams(
    encodeQueryString(options.queryParameters),
  ).toString();
  return requestUrl.toString();
}

/**
 * Http module that wraps around Electron's {ClientRequest} and {net}.
 * Tracks all HTTP requests to Application Insights for monitoring.
 *
 * @class Http
 */
export class Http {
  private static logger: Logger = new Logger(Http.name);

  private static toHttpResponse<T>(
    response: CloudflareAwareHttpResponse<T>,
  ): HttpResponse<T> {
    return {
      body: response.body,
      statusCode: response.statusCode,
      statusMessage: response.statusMessage,
      responseUrl: response.responseUrl,
    };
  }

  /**
   * Tracks an HTTP request as a dependency in Application Insights
   * This populates the Application Map and dependency views
   * Creates a hierarchical structure: postybirb-app -> hostname -> method + pathname
   */
  private static trackHttpDependency(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    success: boolean,
    error?: Error,
  ): void {
    try {
      const urlObj = new URL(url);
      const target = urlObj.origin;
      const name = `${method} ${urlObj.pathname}`;

      // Track as HTTP dependency
      // Using origin as the target creates sub-dependency trees
      // origin -> method + pathname hierarchy in Application Map
      trackDependency(
        name,
        target,
        'HTTP',
        url.substring(0, 500), // Full URL as data
        duration,
        success,
        statusCode,
        {
          method,
          domain: target,
          hasError: error ? 'true' : 'false',
        },
      );

      // Track exception separately if request failed
      if (error || statusCode >= 400) {
        trackException(error ?? new Error(`Status ${statusCode}`), {
          source: 'http-dependency',
          method,
          url: url.substring(0, 200),
          domain: target,
          statusCode: String(statusCode),
        });
      }
    } catch (trackingError) {
      // Don't let tracking errors break the actual HTTP request
      console.error('Error tracking HTTP dependency:', trackingError);
    }
  }

  private static createClientRequest(
    options: HttpOptions,
    crOptions: ClientRequestConstructorOptions & { url: string },
  ): ClientRequest {
    const clientRequestOptions: ClientRequestConstructorOptions & {
      url: string;
    } = {
      ...crOptions,
    };

    // Enforced Options
    // clientRequestOptions.protocol = 'https';

    if (options.partition && options.partition.trim().length) {
      clientRequestOptions.useSessionCookies = true;
      clientRequestOptions.partition = getPartitionKey(options.partition);
    }

    clientRequestOptions.url = getRequestUrl(clientRequestOptions.url, options);

    const req = net.request(clientRequestOptions);
    if (
      clientRequestOptions.method === 'POST' ||
      clientRequestOptions.method === 'PATCH' ||
      clientRequestOptions.method === 'PUT'
    ) {
      if ((options as PostOptions).type === 'multipart') {
        req.chunkedEncoding = true;
      }

      Object.entries(DEFAULT_HEADERS).forEach(([key, value]) => {
        req.setHeader(key, value);
      });
    }

    if (options.headers) {
      Object.entries(options.headers).forEach(([headerKey, headerValue]) => {
        if (RESTRICTED_HEADERS.includes(headerKey)) {
          Http.logger.error(
            `Not allowed to set header: ${headerKey} [https://www.electronjs.org/docs/api/client-request#instance-methods]`,
          );
          throw new Error(`Not allowed to set header: ${headerKey}`);
        }

        req.setHeader(headerKey, headerValue);
      });
    }

    return req;
  }

  private static createPostBody(
    options: PostOptions | BinaryPostOptions,
  ): CreateBodyData {
    const { data, type, options: httpOptions } = options;
    switch (type) {
      case 'json': {
        return {
          contentType: 'application/json',
          buffer: Buffer.from(JSON.stringify(data)),
        };
      }

      case 'urlencoded': {
        const skipIndex = httpOptions?.skipUrlEncodedIndexing ?? false;
        return {
          contentType: 'application/x-www-form-urlencoded',
          buffer: Buffer.from(urlEncoded(data, { skipIndex })),
        };
      }

      case 'binary':
        return {
          contentType: 'application/octet-stream',
          buffer: data as Buffer,
        };

      case 'multipart': {
        const form = new FormData();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.entries(data).forEach(([key, value]: [string, any]) => {
          if (value === undefined || value === null) {
            // form.append(key, '');
            return;
          }

          if (value instanceof FormFile) {
            form.append(key, value.buffer, value.fileOptions);
          } else if (Array.isArray(value)) {
            value.forEach((v) => {
              // handle file objects
              if (v instanceof FormFile) {
                form.append(key, v.buffer, v.fileOptions);
              } else {
                form.append(key, v);
              }
            });
          } else {
            form.append(key, value.toString());
          }
        });

        return {
          contentType: form.getHeaders()['content-type'],
          buffer: form.getBuffer(),
        };
      }

      default: {
        throw new Error(`Unknown post type: ${type}`);
      }
    }
  }

  private static handleError(
    req: ClientRequest,
    reject: (reason?: Error) => void,
  ): void {
    req.on('error', (err: Error) => {
      Http.logger.error(err);
      reject(err);
    });
  }

  private static handleResponse<T>(
    url: string,
    req: ClientRequest,
    resolve: (
      value:
        | CloudflareAwareHttpResponse<T>
        | PromiseLike<CloudflareAwareHttpResponse<T>>,
    ) => void,
    reject: (reason?: Error) => void,
  ): void {
    let responseUrl: undefined | string;

    req.on('redirect', (statusCode, method, redirectUrl, responseHeaders) => {
      responseUrl = redirectUrl;
    });

    req.on('response', (response) => {
      const { headers, statusCode, statusMessage } = response;

      const chunks: Buffer[] = [];

      response.on('error', (err: Error) => {
        Http.logger.error(err);
        reject(err);
      });

      response.on('aborted', () => {
        Http.logger.warn(`Request to ${url} aborted`);
        reject(new Error(`Request to ${url} aborted`));
      });

      response.on('end', () => {
        const message = Buffer.concat(chunks);

        let body: T | string = message.toString();
        const isCloudflareChallenge = Http.isCloudflareChallengeResponse(
          headers,
          body,
        );
        if (
          headers['content-type'] &&
          (headers['content-type'].includes('application/json') ||
            headers['content-type'].includes('application/vnd.api+json'))
        ) {
          try {
            body = JSON.parse(body) as T;
          } catch {
            Http.logger.warn(
              `Unable to parse application/json to object.\nUrl:${url}\nBody: ${body}`,
            );
          }
        }

        return resolve({
          statusCode,
          statusMessage,
          body: body as T,
          responseUrl: responseUrl as unknown as string,
          isCloudflareChallenge,
        });
      });

      response.on('data', (chunk) => {
        chunks.push(chunk);
      });
    });
  }

  static getUserAgent(appVersion: string): string {
    return `PostyBirb/${appVersion}`;
  }

  /**
   * Gets the cookies for a given URL.
   *
   * @static
   * @param {string} partitionId
   * @param {string} url
   * @return {*}  {Promise<Electron.Cookie[]>}
   */
  static async getWebsiteCookies(
    partitionId: string,
    url: string,
  ): Promise<Electron.Cookie[]> {
    return session.fromPartition(`persist:${partitionId}`).cookies.get({
      url: new URL(url).origin,
    });
  }

  /**
   * Creates a GET method request.
   *
   * @param url
   * @param options
   * @param crOptions
   */
  static async get<T>(
    url: string,
    options: HttpOptions,
    crOptions?: ClientRequestConstructorOptions,
  ): Promise<HttpResponse<T>> {
    if (!net.isOnline()) {
      return Promise.reject(new Error('No internet connection.'));
    }

    const startTime = Date.now();
    let statusCode = 0;
    let success = false;
    let error: Error | undefined;

    try {
      const response = await new Promise<CloudflareAwareHttpResponse<T>>(
        (resolve, reject) => {
          const req = Http.createClientRequest(options, {
            ...(crOptions ?? {}),
            url,
          });
          Http.handleError(req, reject);
          Http.handleResponse(url, req, resolve, reject);
          req.end();
        },
      );

      statusCode = response.statusCode ?? 0;
      success = statusCode >= 200 && statusCode < 400;

      if (response.isCloudflareChallenge) {
        Http.logger.warn(`Cloudflare challenge detected for GET ${url}`);
        if (!options.cloudflareChallenge?.openBrowserWindow) {
          return Http.toHttpResponse(response);
        }
        return await Http.performBrowserWindowGetRequest<T>(
          url,
          options,
          crOptions,
        );
      }
      return Http.toHttpResponse(response);
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      Http.trackHttpDependency(
        'GET',
        url,
        statusCode,
        duration,
        success,
        error,
      );
    }
  }

  /**
   * Creates a POST method request.
   *
   * @param url
   * @param options
   * @param crOptions
   */
  static async post<T>(
    url: string,
    options: PostOptions | BinaryPostOptions,
    crOptions?: ClientRequestConstructorOptions,
  ): Promise<HttpResponse<T>> {
    return Http.postLike('post', url, options, crOptions ?? {});
  }

  /**
   * Creates a PATCH method request.
   *
   * @param url
   * @param options
   * @param crOptions
   */
  static patch<T>(
    url: string,
    options: PostOptions,
    crOptions?: ClientRequestConstructorOptions,
  ): Promise<HttpResponse<T>> {
    return Http.postLike('patch', url, options, crOptions ?? {});
  }

  /**
   * Creates a PUT method request.
   *
   * @param url
   * @param options
   * @param crOptions
   */
  static put<T>(
    url: string,
    options: PostOptions | BinaryPostOptions,
    crOptions?: ClientRequestConstructorOptions,
  ): Promise<HttpResponse<T>> {
    return Http.postLike('put', url, options, crOptions ?? {});
  }

  private static async postLike<T>(
    method: 'post' | 'patch' | 'put',
    url: string,
    options: PostOptions | BinaryPostOptions,
    crOptions: ClientRequestConstructorOptions,
  ): Promise<HttpResponse<T>> {
    if (!net.isOnline()) {
      return Promise.reject(new Error('No internet connection.'));
    }

    const startTime = Date.now();
    let statusCode = 0;
    let success = false;
    let error: Error | undefined;

    try {
      // When uploadAsRawData is set, bypass net.request and send via
      // BrowserWindow.loadURL with the body as raw bytes.
      if (options.uploadAsRawData) {
        const response = await Http.performBrowserWindowPostRequest<T>(
          url,
          options,
          crOptions ?? {},
        );
        statusCode = response.statusCode ?? 0;
        success = statusCode >= 200 && statusCode < 400;
        return response;
      }

      const response = await new Promise<CloudflareAwareHttpResponse<T>>(
        (resolve, reject) => {
          const req = Http.createClientRequest(options, {
            ...(crOptions ?? {}),
            url,
            method,
          });
          Http.handleError(req, reject);
          Http.handleResponse(url, req, resolve, reject);

          const { contentType, buffer } = Http.createPostBody(options);
          req.setHeader('Content-Type', contentType);
          req.write(buffer);
          req.end();
        },
      );

      statusCode = response.statusCode ?? 0;
      success = statusCode >= 200 && statusCode < 400;

      if (response.isCloudflareChallenge) {
        Http.logger.warn(
          `Cloudflare challenge detected for ${method.toUpperCase()} ${url}`,
        );
        if (!options.cloudflareChallenge?.openBrowserWindow) {
          return Http.toHttpResponse(response);
        }
        return await Http.performBrowserWindowPostRequest<T>(
          url,
          options,
          crOptions,
          true,
        );
      }
      return Http.toHttpResponse(response);
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      Http.trackHttpDependency(
        method.toUpperCase(),
        url,
        statusCode,
        duration,
        success,
        error,
      );
    }
  }

  private static async performBrowserWindowGetRequest<T>(
    url: string,
    options: HttpOptions,
    crOptions?: ClientRequestConstructorOptions,
  ): Promise<HttpResponse<T>> {
    const window = new BrowserWindow({
      show: false,
      webPreferences: {
        partition: options.partition
          ? getPartitionKey(options.partition)
          : undefined,
      },
    });

    try {
      await window.loadURL(getRequestUrl(url, options));
      return await Http.handleCloudflareChallengePage<T>(
        window,
        options.cloudflareChallenge,
        true,
      );
    } catch (err) {
      console.error(err);
      return await Promise.reject(err);
    } finally {
      if (!window.isDestroyed()) {
        window.destroy();
      }
    }
  }

  private static async performBrowserWindowPostRequest<T>(
    url: string,
    options: PostOptions | BinaryPostOptions,
    crOptions: ClientRequestConstructorOptions,
    challengeExpected = false,
  ): Promise<HttpResponse<T>> {
    const { contentType, buffer } = Http.createPostBody(options);
    const headers = Object.entries({
      ...(options.headers ?? {}),
      'Content-Type': contentType,
    })
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const window = new BrowserWindow({
      show: false,
      webPreferences: {
        partition: options.partition
          ? getPartitionKey(options.partition)
          : undefined,
      },
    });

    try {
      await window.loadURL(getRequestUrl(url, options), {
        extraHeaders: headers,
        postData: [
          {
            type: 'rawData',
            bytes: buffer,
          },
        ],
      });
      return await Http.handleCloudflareChallengePage<T>(
        window,
        options.cloudflareChallenge,
        challengeExpected,
      );
    } catch (err) {
      console.error(err);
      return await Promise.reject(err);
    } finally {
      if (!window.isDestroyed()) {
        window.destroy();
      }
    }
  }

  private static isCloudflareChallengeResponse(
    headers: Record<string, string | string[]>,
    body: string,
  ): boolean {
    const mitigatedHeader = Object.entries(headers).find(
      ([name]) => name.toLowerCase() === 'cf-mitigated',
    )?.[1];
    const values = Array.isArray(mitigatedHeader)
      ? mitigatedHeader
      : [mitigatedHeader];

    return (
      values.some((value) => value?.trim().toLowerCase() === 'challenge') ||
      Http.isOnCloudflareChallengePage(body)
    );
  }

  private static isOnCloudflareChallengePage(html: string): boolean {
    return [
      /<title[^>]*>\s*just a moment(?:\.\.\.)?\s*<\/title>/i,
      /(?:id|class)=["'][^"']*challenge-error-title/i,
      /window\._cf_chl_opt/i,
      /\/cdn-cgi\/challenge-platform\//i,
    ].some((pattern) => pattern.test(html));
  }

  private static async awaitCloudflareChallengePage(
    window: BrowserWindow,
    timeoutMs: number,
  ): Promise<void> {
    const checkInterval = 1000; // 1 second
    const attempts = Math.ceil(timeoutMs / checkInterval);

    window.show();
    window.focus();

    for (let i = 0; i < attempts; i++) {
      await Http.awaitCheckInterval(checkInterval);
      if (window.isDestroyed()) {
        throw new Error('Cloudflare challenge window was closed.');
      }
      const html = await window.webContents.executeJavaScript(
        'document.documentElement?.outerHTML ?? ""',
      );
      if (!Http.isOnCloudflareChallengePage(html)) {
        return;
      }
    }

    throw new Error('Timed out waiting for the Cloudflare challenge.');
  }

  private static async awaitCheckInterval(interval: number): Promise<void> {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, interval);
    });
  }

  private static async handleCloudflareChallengePage<T>(
    window: BrowserWindow,
    options?: CloudflareChallengeOptions,
    challengeExpected = false,
  ): Promise<HttpResponse<T>> {
    let html = await window.webContents.executeJavaScript(
      'document.documentElement?.outerHTML ?? ""',
    );

    if (challengeExpected || Http.isOnCloudflareChallengePage(html)) {
      if (!options?.openBrowserWindow) {
        throw new Error(
          'Cloudflare challenge detected. Enable the interactive Cloudflare challenge window in settings to continue.',
        );
      }
      await Http.awaitCloudflareChallengePage(
        window,
        options.timeoutMs ?? DEFAULT_CLOUDFLARE_CHALLENGE_TIMEOUT,
      );
      html = await window.webContents.executeJavaScript(
        'document.documentElement?.outerHTML ?? ""',
      );
    }

    const text = await window.webContents.executeJavaScript(
      'document.body.innerText',
    );
    const pageUrl = await window.webContents.executeJavaScript(
      'window.location.href',
    );

    let rValue = html;
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        rValue = JSON.parse(text);
      } catch (err) {
        console.error(pageUrl, text, err);
      }
    }

    return Promise.resolve({
      body: rValue as unknown as T,
      statusCode: 200,
      statusMessage: 'OK',
      responseUrl: pageUrl,
    });
  }
}

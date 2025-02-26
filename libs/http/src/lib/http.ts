import { Logger } from '@nestjs/common';
import {
  BrowserWindow,
  ClientRequest,
  ClientRequestConstructorOptions,
  net,
} from 'electron';
import FormData from 'form-data';
import urlEncoded from 'form-urlencoded';
import { encode as encodeQueryString } from 'querystring';

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

interface HttpOptions {
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
  partition: string | undefined;
}

interface PostOptions extends HttpOptions {
  type: 'multipart' | 'json' | 'urlencoded';
  data: Record<string, unknown>;
}

interface BinaryPostOptions extends HttpOptions {
  type: 'binary';
  data: Buffer;
}

export interface HttpResponse<T> {
  body: T;
  statusCode: number;
  statusMessage: string;
  responseUrl: string;
}

interface CreateBodyData {
  contentType: string;
  buffer: Buffer;
}

function getPartitionKey(partition: string): string {
  return `persist:${partition}`;
}

/**
 * Http module that wraps around Electron's {ClientRequest} and {net}.
 * @todo Post testing
 * @todo Test return the responseUrl
 *
 * @class Http
 */
export class Http {
  private static logger: Logger = new Logger(Http.name);

  private static createClientRequest(
    options: HttpOptions,
    crOptions: ClientRequestConstructorOptions,
  ): ClientRequest {
    const clientRequestOptions: ClientRequestConstructorOptions = {
      ...crOptions,
    };

    // Enforced Options
    // clientRequestOptions.protocol = 'https';

    if (options.partition && options.partition.trim().length) {
      clientRequestOptions.useSessionCookies = true;
      clientRequestOptions.partition = getPartitionKey(options.partition);
    }

    if (options.queryParameters) {
      const url = new URL(clientRequestOptions.url);
      url.search = new URLSearchParams(
        encodeQueryString(options.queryParameters),
      ).toString();
      clientRequestOptions.url = url.toString();
    }

    const req = net.request(clientRequestOptions);
    if (
      clientRequestOptions.method === 'POST' ||
      clientRequestOptions.method === 'PATCH'
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
    const { data, type } = options;
    switch (type) {
      case 'json': {
        return {
          contentType: 'application/json',
          buffer: Buffer.from(JSON.stringify(data)),
        };
      }

      case 'urlencoded': {
        return {
          contentType: 'application/x-www-form-urlencoded',
          buffer: Buffer.from(urlEncoded(data)),
        };
      }

      case 'binary':
        return {
          contentType: 'binary/octet-stream',
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

          if (value.options && value.value) {
            form.append(key, value.value, value.options);
          } else if (Array.isArray(value)) {
            form.append(key, JSON.stringify(value));
          } else {
            form.append(key, value);
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
    resolve: (value: HttpResponse<T> | PromiseLike<HttpResponse<T>>) => void,
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
        if (
          headers['content-type'] &&
          headers['content-type'].includes('application/json')
        ) {
          try {
            body = JSON.parse(body) as T;
          } catch {
            Http.logger.warn(
              `Unable to parse application/json to object.\nUrl:${url}\nBody: ${body}`,
            );
          }
        }

        resolve({
          statusCode,
          statusMessage,
          body: body as T,
          responseUrl,
        });
      });

      response.on('data', (chunk) => {
        chunks.push(chunk);
      });
    });
  }

  /**
   * Creates a GET method request.
   *
   * @static
   * @param {string} url
   * @param {HttpOptions} options
   * @param {ClientRequestConstructorOptions} [crOptions]
   * @return {*}  {Promise<HttpResponse<T>>}
   * @memberof Http
   */
  static get<T>(
    url: string,
    options: HttpOptions,
    crOptions?: ClientRequestConstructorOptions,
  ): Promise<HttpResponse<T>> {
    if (!net.isOnline()) {
      return Promise.reject(new Error('No internet connection.'));
    }

    return new Promise((resolve, reject) => {
      const req = Http.createClientRequest(options, {
        ...(crOptions ?? {}),
        url,
      });
      Http.handleError(req, reject);
      Http.handleResponse(url, req, resolve, reject);
      req.end();
    }).then((response: HttpResponse<T>) => {
      const { body } = response;
      if (typeof body === 'string' && Http.isOnCloudFlareChallengePage(body)) {
        console.log('Cloudflare detected. Attempting to bypass...');
        return Http.performBrowserWindowGetRequest<T>(url, options, crOptions);
      }

      return response;
    });
  }

  /**
   * Creates a POST method request.
   *
   * @static
   * @param {string} url
   * @param {PostOptions} options
   * @param {ClientRequestConstructorOptions} crOptions
   * @return {*}  {Promise<HttpResponse<T>>}
   * @memberof Http
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
   * @static
   * @param {string} url
   * @param {PostOptions} options
   * @param {ClientRequestConstructorOptions} crOptions
   * @return {*}  {Promise<HttpResponse<T>>}
   * @memberof Http
   */
  static patch<T>(
    url: string,
    options: PostOptions,
    crOptions?: ClientRequestConstructorOptions,
  ): Promise<HttpResponse<T>> {
    return Http.postLike('patch', url, options, crOptions ?? {});
  }

  private static postLike<T>(
    method: 'post' | 'patch',
    url: string,
    options: PostOptions | BinaryPostOptions,
    crOptions: ClientRequestConstructorOptions,
  ): Promise<HttpResponse<T>> {
    if (!net.isOnline()) {
      return Promise.reject(new Error('No internet connection.'));
    }

    return new Promise((resolve, reject) => {
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
    }).then((response: HttpResponse<T>) => {
      const { body } = response;
      if (typeof body === 'string' && Http.isOnCloudFlareChallengePage(body)) {
        console.log('Cloudflare detected. Attempting to bypass...');
        return Http.performBrowserWindowPostRequest<T>(url, options, crOptions);
      }

      return response;
    });
  }

  private static async performBrowserWindowGetRequest<T>(
    url: string,
    options: HttpOptions,
    crOptions?: ClientRequestConstructorOptions,
  ): Promise<HttpResponse<T>> {
    const window = new BrowserWindow({
      show: false,
      webPreferences: {
        partition: getPartitionKey(options.partition),
      },
    });

    try {
      await window.loadURL(url);
      return await Http.handleCloudFlareChallengePage<T>(window);
    } catch (err) {
      console.error(err);
      return await Promise.reject(err);
    } finally {
      window.destroy();
    }
  }

  private static async performBrowserWindowPostRequest<T>(
    url: string,
    options: PostOptions | BinaryPostOptions,
    crOptions: ClientRequestConstructorOptions,
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
        partition: getPartitionKey(options.partition),
      },
    });

    try {
      await window.loadURL(url, {
        extraHeaders: headers,
        postData: [
          {
            type: 'rawData',
            bytes: buffer,
          },
        ],
      });
      return await Http.handleCloudFlareChallengePage<T>(window);
    } catch (err) {
      console.error(err);
      return await Promise.reject(err);
    } finally {
      window.destroy();
    }
  }

  private static isOnCloudFlareChallengePage(html: string): boolean {
    if (
      html.includes('challenge-error-title') ||
      html.includes('<title>Just a moment...</title>')
    ) {
      return true;
    }
    return false;
  }

  private static async awaitCloudFlareChallengePage(
    window: BrowserWindow,
  ): Promise<void> {
    const checkInterval = 1000; // 1 second

    let isShown = false;
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < 60; i++) {
      await Http.awaitCheckInterval(checkInterval);
      const html = await window.webContents.executeJavaScript(
        'document.body.parentElement.innerHTML',
      );
      if (i >= 3 && !isShown) {
        // Try to let it solve itself for 3 seconds before showing the window.
        window.show();
        window.focus();
        isShown = true;
      }
      if (!Http.isOnCloudFlareChallengePage(html)) {
        return;
      }
    }

    throw new Error('Unable to bypass Cloudflare challenge.');
  }

  private static async awaitCheckInterval(interval: number): Promise<void> {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, interval);
    });
  }

  private static async handleCloudFlareChallengePage<T>(
    window: BrowserWindow,
  ): Promise<HttpResponse<T>> {
    let html = await window.webContents.executeJavaScript(
      'document.body.parentElement.innerHTML',
    );

    if (Http.isOnCloudFlareChallengePage(html)) {
      await Http.awaitCloudFlareChallengePage(window);
      html = await window.webContents.executeJavaScript(
        'document.body.parentElement.innerHTML',
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

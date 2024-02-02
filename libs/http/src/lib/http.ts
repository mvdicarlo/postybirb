import { Logger } from '@nestjs/common';
import { getPartitionKey } from '@postybirb/utils/electron';
import { ClientRequest, ClientRequestConstructorOptions, net } from 'electron';
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

interface HttpResponse<T> {
  body: T;
  statusCode: number;
  statusMessage: string;
  responseUrl: string;
}

interface CreateBodyData {
  contentType: string;
  buffer: Buffer;
}

/**
 * Http module that wraps around Electron's {ClientRequest} and {net}.
 * @todo Post testing
 * @todo Re-attempt with BrowserWindow on Cloudflare Challenge
 * @todo Test return the responseUrl
 *
 * @export
 * @class Http
 */
export class Http {
  private static logger: Logger = new Logger(Http.name);

  private static createClientRequest(
    options: HttpOptions,
    crOptions: ClientRequestConstructorOptions
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
        encodeQueryString(options.queryParameters)
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

      if (options.headers) {
        Object.entries(([headerKey, headerValue]) => {
          if (RESTRICTED_HEADERS.includes(headerKey)) {
            Http.logger.error(
              `Not allowed to set header: ${headerKey} [https://www.electronjs.org/docs/api/client-request#instance-methods]`
            );
            throw new Error(`Not allowed to set header: ${headerKey}`);
          }

          req.setHeader(headerKey, headerValue);
        });
      }
    }

    return req;
  }

  private static createPostBody(options: PostOptions): CreateBodyData {
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

      case 'multipart': {
        const form = new FormData();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.entries(data).forEach(([key, value]: [string, any]) => {
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
    reject: (reason?: Error) => void
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
    reject: (reason?: Error) => void
  ): void {
    let responseUrl: undefined | string;

    // TODO figure out if I need to call followRedirect even though follow is default behavior
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
              `Unable to parse application/json to object.\nUrl:${url}\nBody: ${body}`
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
    crOptions?: ClientRequestConstructorOptions
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
    options: PostOptions,
    crOptions: ClientRequestConstructorOptions
  ): Promise<HttpResponse<T>> {
    return Http.postLike('post', url, options, crOptions);
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
    crOptions: ClientRequestConstructorOptions
  ): Promise<HttpResponse<T>> {
    return Http.postLike('patch', url, options, crOptions);
  }

  private static postLike<T>(
    method: 'post' | 'patch',
    url: string,
    options: PostOptions,
    crOptions: ClientRequestConstructorOptions
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
    });
  }
}

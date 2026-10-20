import { Logger } from '@nestjs/common';
import { getPartitionKey } from '@postybirb/utils/common';
import {
  type ClientRequest,
  type ClientRequestConstructorOptions,
  net,
} from 'electron';
import { isCloudflareChallengeResponse } from './cloudflare-challenge';
import {
  createTimeoutError,
  DEFAULT_REQUEST_TIMEOUT,
  DEFAULT_UPLOAD_TIMEOUT,
  getRequestUrl,
} from './request-utils';
import type { HttpOptions, HttpRequestBody, HttpResponse } from './types';

export interface CloudflareAwareHttpResponse<T> extends HttpResponse<T> {
  isCloudflareChallenge: boolean;
}

const logger = new Logger('Http');

// https://www.electronjs.org/docs/api/client-request#instance-methods
const RESTRICTED_HEADERS = [
  'Content-Length',
  'Host',
  'Trailer',
  'TE',
  'Upgrade',
  'Cookie2',
  'Keep-Alive',
  'Transfer-Encoding',
];

const DEFAULT_HEADERS: Record<string, string> = {
  'Accept-Encoding': 'gzip, deflate, br',
};

function createClientRequest(
  options: HttpOptions,
  crOptions: ClientRequestConstructorOptions & { url: string },
): ClientRequest {
  const clientRequestOptions = { ...crOptions };

  if (options.partition && options.partition.trim().length) {
    clientRequestOptions.useSessionCookies = true;
    clientRequestOptions.partition = getPartitionKey(options.partition);
  }
  clientRequestOptions.url = getRequestUrl(clientRequestOptions.url, options);

  const request = net.request(clientRequestOptions);
  if (
    clientRequestOptions.method === 'POST' ||
    clientRequestOptions.method === 'PATCH' ||
    clientRequestOptions.method === 'PUT'
  ) {
    if ('type' in options && options.type === 'multipart') {
      request.chunkedEncoding = true;
    }
    Object.entries(DEFAULT_HEADERS).forEach(([key, value]) => {
      request.setHeader(key, value);
    });
  }

  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      if (RESTRICTED_HEADERS.includes(key)) {
        logger.error(
          `Not allowed to set header: ${key} [https://www.electronjs.org/docs/api/client-request#instance-methods]`,
        );
        throw new Error(`Not allowed to set header: ${key}`);
      }
      request.setHeader(key, value);
    });
  }

  return request;
}

function handleResponse<T>(
  url: string,
  request: ClientRequest,
  resolve: (response: CloudflareAwareHttpResponse<T>) => void,
  reject: (reason: Error) => void,
): void {
  let responseUrl: string | undefined;

  request.on('redirect', (statusCode, method, redirectUrl) => {
    responseUrl = redirectUrl;
  });

  request.on('response', (response) => {
    const { headers, statusCode, statusMessage } = response;
    const chunks: Buffer[] = [];

    response.on('error', (error: Error) => {
      logger.error(error);
      reject(error);
    });
    response.on('aborted', () => {
      logger.warn(`Request to ${url} aborted`);
      reject(new Error(`Request to ${url} aborted`));
    });
    response.on('end', () => {
      let body: T | string = Buffer.concat(chunks).toString();
      const isCloudflareChallenge = isCloudflareChallengeResponse(
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
          logger.warn(
            `Unable to parse application/json to object.\nUrl:${url}\nBody: ${body}`,
          );
        }
      }
      resolve({
        statusCode,
        statusMessage,
        body: body as T,
        responseUrl: responseUrl as string,
        isCloudflareChallenge,
      });
    });
    response.on('data', (chunk) => {
      chunks.push(chunk);
    });
  });
}

export function requestWithClientRequest<T>(
  url: string,
  options: HttpOptions,
  crOptions: ClientRequestConstructorOptions & { url: string },
  body?: HttpRequestBody,
): Promise<CloudflareAwareHttpResponse<T>> {
  const timeoutMs = body ? DEFAULT_UPLOAD_TIMEOUT : DEFAULT_REQUEST_TIMEOUT;

  return new Promise((resolve, reject) => {
    const request = createClientRequest(options, crOptions);
    let settled = false;

    const cleanup = () => {
      clearTimeout(timer);
    };
    const rejectRequest = (reason: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(reason);
    };
    const abortRequest = (
      reason: Error = new Error('HTTP request aborted'),
    ) => {
      if (settled) return;
      rejectRequest(reason);
      request.abort();
    };
    const timer = setTimeout(() => {
      abortRequest(createTimeoutError(timeoutMs));
    }, timeoutMs);

    request.on('error', (error: Error) => {
      logger.error(error);
      abortRequest(error);
    });
    handleResponse<T>(
      url,
      request,
      (response) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(response);
      },
      abortRequest,
    );
    request.on('abort', () => rejectRequest(new Error('HTTP request aborted')));

    try {
      if (body) {
        request.setHeader('Content-Type', body.contentType);
        request.write(body.buffer);
      }
      request.end();
    } catch (error) {
      abortRequest(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

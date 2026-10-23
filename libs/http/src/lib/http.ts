import { Logger } from '@nestjs/common';
import { getPartitionKey } from '@postybirb/utils/common';
import { type ClientRequestConstructorOptions, net, session } from 'electron';
import { requestWithBrowserWindow } from './browser-request';
import {
  type CloudflareAwareHttpResponse,
  requestWithClientRequest,
} from './client-request';
import { trackHttpDependency } from './http-telemetry';
import { createRequestBody } from './request-body';
import type {
  BinaryPostOptions,
  HttpOptions,
  HttpResponse,
  PostOptions,
} from './types';

export type {
  BinaryPostOptions,
  CloudflareChallengeOptions,
  HttpOptions,
  HttpRequestBody,
  HttpRequestOptions,
  HttpResponse,
  PostOptions,
} from './types';

type HttpRequest =
  | { method: 'GET'; options: HttpOptions }
  | {
      method: 'post' | 'patch' | 'put';
      options: PostOptions | BinaryPostOptions;
    };

/**
 * Electron-backed HTTP facade with Cloudflare fallback and dependency tracking.
 */
export class Http {
  private static logger = new Logger(Http.name);

  static getUserAgent(appVersion: string): string {
    return `PostyBirb/${appVersion}`;
  }

  static async getWebsiteCookies(
    partitionId: string,
    url: string,
  ): Promise<Electron.Cookie[]> {
    return session.fromPartition(getPartitionKey(partitionId)).cookies.get({
      url: new URL(url).origin,
    });
  }

  static async get<T>(
    url: string,
    options: HttpOptions,
    crOptions?: ClientRequestConstructorOptions,
  ): Promise<HttpResponse<T>> {
    return Http.request<T>(url, { method: 'GET', options }, crOptions);
  }

  static async post<T>(
    url: string,
    options: PostOptions | BinaryPostOptions,
    crOptions?: ClientRequestConstructorOptions,
  ): Promise<HttpResponse<T>> {
    return Http.request<T>(url, { method: 'post', options }, crOptions);
  }

  static patch<T>(
    url: string,
    options: PostOptions,
    crOptions?: ClientRequestConstructorOptions,
  ): Promise<HttpResponse<T>> {
    return Http.request<T>(url, { method: 'patch', options }, crOptions);
  }

  static put<T>(
    url: string,
    options: PostOptions | BinaryPostOptions,
    crOptions?: ClientRequestConstructorOptions,
  ): Promise<HttpResponse<T>> {
    return Http.request<T>(url, { method: 'put', options }, crOptions);
  }

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

  private static async request<T>(
    url: string,
    request: HttpRequest,
    crOptions?: ClientRequestConstructorOptions,
  ): Promise<HttpResponse<T>> {
    if (!net.isOnline()) {
      throw new Error('No internet connection.');
    }

    const { options } = request;
    const method = request.method.toUpperCase();
    const startTime = Date.now();
    let statusCode = 0;
    let success = false;
    let error: Error | undefined;

    try {
      const body =
        request.method === 'GET'
          ? undefined
          : createRequestBody(request.options);

      if (request.method !== 'GET' && request.options.uploadAsRawData) {
        const response = await requestWithBrowserWindow<T>(url, options, body);
        if (!response) {
          throw new Error(
            'Cloudflare challenge detected. Enable the interactive Cloudflare challenge window in settings to continue.',
          );
        }
        statusCode = response.statusCode ?? 0;
        success = statusCode >= 200 && statusCode < 400;
        return response;
      }

      const clientRequestOptions = { ...crOptions, url };
      if (request.method !== 'GET') {
        clientRequestOptions.method = request.method;
      }
      const response = await requestWithClientRequest<T>(
        url,
        options,
        clientRequestOptions,
        body,
      );

      statusCode = response.statusCode ?? 0;
      success = statusCode >= 200 && statusCode < 400;

      if (response.isCloudflareChallenge) {
        Http.logger.warn(`Cloudflare challenge detected for ${method} ${url}`);
        const browserResponse = await requestWithBrowserWindow<T>(
          url,
          options,
          body,
          true,
        );
        const finalResponse = browserResponse ?? Http.toHttpResponse(response);
        statusCode = finalResponse.statusCode ?? 0;
        success =
          browserResponse !== undefined &&
          statusCode >= 200 &&
          statusCode < 400;
        return finalResponse;
      }

      return Http.toHttpResponse(response);
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      success = false;
      throw err;
    } finally {
      trackHttpDependency(
        method,
        url,
        statusCode,
        Date.now() - startTime,
        success,
        error,
      );
    }
  }
}

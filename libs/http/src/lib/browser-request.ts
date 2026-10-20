import { getPartitionKey } from '@postybirb/utils/common';
import { BrowserWindow } from 'electron';
import {
  type CloudflareChallengeWindow,
  DEFAULT_CLOUDFLARE_CHALLENGE_TIMEOUT,
  isCloudflareChallengePage,
  resolveCloudflareChallenge,
} from './cloudflare-challenge';
import {
  createTimeoutError,
  DEFAULT_UPLOAD_TIMEOUT,
  getRequestUrl,
} from './request-utils';
import type {
  CloudflareChallengeOptions,
  HttpOptions,
  HttpRequestBody,
  HttpResponse,
} from './types';

export async function readBrowserWindowResponse<T>(
  window: CloudflareChallengeWindow,
  options?: CloudflareChallengeOptions,
  challengeExpected = false,
): Promise<HttpResponse<T> | undefined> {
  let html = await window.webContents.executeJavaScript(
    'document.documentElement?.outerHTML ?? ""',
  );

  if (challengeExpected || isCloudflareChallengePage(html)) {
    const resolved = await resolveCloudflareChallenge(window, options);
    if (!resolved) {
      return undefined;
    }
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

  let body = html;
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      body = JSON.parse(text);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(pageUrl, text, error);
    }
  }

  return {
    body: body as T,
    statusCode: 200,
    statusMessage: 'OK',
    responseUrl: pageUrl,
  };
}

export async function requestWithBrowserWindow<T>(
  url: string,
  options: HttpOptions,
  body?: HttpRequestBody,
  challengeExpected = false,
): Promise<HttpResponse<T> | undefined> {
  const timeoutMs = body
    ? DEFAULT_UPLOAD_TIMEOUT
    : DEFAULT_CLOUDFLARE_CHALLENGE_TIMEOUT;
  const loadOptions: Parameters<BrowserWindow['loadURL']>[1] = body
    ? {
        extraHeaders: Object.entries({
          ...(options.headers ?? {}),
          'Content-Type': body.contentType,
        })
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n'),
        postData: [{ type: 'rawData', bytes: body.buffer }],
      }
    : undefined;
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      partition: options.partition
        ? getPartitionKey(options.partition)
        : undefined,
    },
  });

  try {
    return await new Promise<HttpResponse<T> | undefined>((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        clearTimeout(timer);
      };
      const stop = (reason: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (!window.isDestroyed()) window.destroy();
        reject(reason);
      };
      const timer = setTimeout(
        () => stop(createTimeoutError(timeoutMs)),
        timeoutMs,
      );

      const load = async () => {
        await window.loadURL(getRequestUrl(url, options), loadOptions);
        if (window.isDestroyed()) {
          throw new Error('HTTP request window was closed');
        }
        return readBrowserWindowResponse<T>(
          window,
          options.cloudflareChallenge,
          challengeExpected,
        );
      };
      load().then((response) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(response);
      }, stop);
    });
  } finally {
    if (!window.isDestroyed()) {
      window.destroy();
    }
  }
}

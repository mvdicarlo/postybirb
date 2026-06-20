import http from 'node:http';
import nodeHttps from 'node:https';
import { createProxyAgent, ProxyProfile } from '@postybirb/utils/common';

export type ProfileAgentRequestInit = {
  method: string;
  headers?: Record<string, string>;
  body?: Buffer;
};

export type ProfileAgentResponse<T = string> = {
  statusCode: number;
  statusMessage: string;
  body: T;
  responseUrl?: string;
};

function parseResponseBody<T>(
  buffer: Buffer,
  contentType: string | undefined,
): T | string {
  const text = buffer.toString();
  if (
    contentType &&
    (contentType.includes('application/json') ||
      contentType.includes('application/vnd.api+json'))
  ) {
    try {
      return JSON.parse(text) as T;
    } catch {
      return text;
    }
  }

  return text;
}

/**
 * Sends an HTTP request through a Node proxy agent (Path B routing).
 * Used for profile-scoped traffic that does not need a cookie partition.
 */
export function requestViaProfileAgent<T = string>(
  profile: ProxyProfile,
  url: string,
  init: ProfileAgentRequestInit,
): Promise<ProfileAgentResponse<T>> {
  const parsedUrl = new URL(url);
  const secure = parsedUrl.protocol === 'https:';
  const agent = createProxyAgent(profile, secure);
  if (!agent) {
    return Promise.reject(new Error('Proxy profile is not configured'));
  }

  const lib = secure ? nodeHttps : http;

  return new Promise((resolve, reject) => {
    const req = lib.request(
      parsedUrl,
      {
        method: init.method,
        headers: init.headers,
        agent,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('error', reject);
        response.on('end', () => {
          const message = Buffer.concat(chunks);
          const contentType = response.headers['content-type'];
          resolve({
            statusCode: response.statusCode ?? 0,
            statusMessage: response.statusMessage ?? '',
            body: parseResponseBody<T>(message, contentType) as T,
          });
        });
      },
    );

    req.on('error', reject);

    if (init.body) {
      req.write(init.body);
    }

    req.end();
  });
}

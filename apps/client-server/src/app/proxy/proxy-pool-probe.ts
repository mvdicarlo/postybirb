import http from 'node:http';
import nodeHttps from 'node:https';
import type { ProxyPoolEntry } from '@postybirb/types';
import {
  buildProxyAgentUrl,
  createProxyAgent,
  toEnabledProxyProfile,
} from '@postybirb/utils/common';

type ProbeOptions = {
  method?: 'GET' | 'HEAD';
  timeoutMs?: number;
};

export type ProxyPoolProbeResult = {
  statusCode: number;
};

export async function probeProxyPoolEntry(
  entry: ProxyPoolEntry,
  url: string,
  options: ProbeOptions = {},
): Promise<ProxyPoolProbeResult> {
  const profile = toEnabledProxyProfile(entry);
  const agentUrl = buildProxyAgentUrl(profile);
  if (!agentUrl) {
    throw new Error('Proxy host and port are required');
  }

  const parsedUrl = new URL(url);
  const secure = parsedUrl.protocol === 'https:';
  const agent = createProxyAgent(profile, secure);
  if (!agent) {
    throw new Error('Proxy host and port are required');
  }

  const lib = secure ? nodeHttps : http;
  const method = options.method ?? 'HEAD';
  const timeoutMs = options.timeoutMs ?? 15_000;

  return new Promise((resolve, reject) => {
    let timeout: NodeJS.Timeout | undefined;

    const req = lib.request(
      parsedUrl,
      {
        method,
        agent,
      },
      (response) => {
        if (timeout) {
          clearTimeout(timeout);
        }
        response.resume();
        resolve({ statusCode: response.statusCode ?? 0 });
      },
    );

    timeout = setTimeout(() => {
      req.destroy(new Error('Probe timed out'));
    }, timeoutMs);

    req.on('error', (error) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      reject(error);
    });

    req.end();
  });
}

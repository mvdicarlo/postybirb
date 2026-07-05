export function toError(value: unknown) {
  if (value instanceof Error) return value;
  if (value && typeof value === 'object')
    return new Error(JSON.stringify(value));

  return new Error(String(value));
}

const DEFAULT_CLOUD_API_URL = 'https://postybirb.azurewebsites.net/api';

export function resolveCloudApiUrl(): string {
  return process.env.POSTYBIRB_CLOUD_URL || DEFAULT_CLOUD_API_URL;
}

export type ShouldBypassProxyOptions = {
  remoteHost?: string;
  appPort?: string;
};

function parseRemoteHostInput(remoteHost: string): string | null {
  const trimmed = remoteHost.trim();
  if (!trimmed) {
    return null;
  }

  try {
    if (trimmed.includes('://')) {
      return new URL(trimmed).hostname.toLowerCase();
    }
  } catch {
    // Fall through to host:port parsing.
  }

  return trimmed.split(':')[0]?.toLowerCase() ?? null;
}

function resolveUrlPort(url: URL): string {
  if (url.port) {
    return url.port;
  }

  if (url.protocol === 'https:') {
    return '443';
  }

  if (url.protocol === 'http:') {
    return '80';
  }

  return '';
}

export function shouldBypassProxyForUrl(
  rawUrl: string,
  options?: ShouldBypassProxyOptions,
): boolean {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();

    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return true;
    }

    const appPort = options?.appPort?.trim();
    if (
      appPort &&
      (host === 'localhost' || host === '127.0.0.1' || host === '::1') &&
      resolveUrlPort(url) === appPort
    ) {
      return true;
    }

    const remoteHost = options?.remoteHost
      ? parseRemoteHostInput(options.remoteHost)
      : null;
    if (remoteHost && host === remoteHost) {
      return true;
    }

    const cloudApiUrl = resolveCloudApiUrl();
    try {
      const cloudHost = new URL(cloudApiUrl).hostname.toLowerCase();
      if (cloudHost && host === cloudHost) {
        return true;
      }
    } catch {
      // Ignore invalid cloud URL configuration.
    }
  } catch {
    // If URL cannot be parsed we should not bypass proxy automatically.
  }

  return false;
}

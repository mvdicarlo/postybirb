import type { BrowserWindow } from 'electron';
import type { CloudflareChallengeOptions } from './types';

export type CloudflareChallengeWindow = Pick<
  BrowserWindow,
  'isDestroyed' | 'show' | 'focus'
> & {
  webContents: Pick<BrowserWindow['webContents'], 'executeJavaScript'>;
};

export const DEFAULT_CLOUDFLARE_CHALLENGE_TIMEOUT = 5 * 60 * 1000;
const INVISIBLE_CHALLENGE_TIMEOUT = 3 * 1000;
const CHALLENGE_CHECK_INTERVAL = 1000;

export function isCloudflareChallengePage(html: string): boolean {
  return [
    /<title[^>]*>\s*just a moment(?:\.\.\.)?\s*<\/title>/i,
    /(?:id|class)=["'][^"']*challenge-error-title/i,
    /window\._cf_chl_opt/i,
  ].some((pattern) => pattern.test(html));
}

export function isCloudflareChallengeResponse(
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
    isCloudflareChallengePage(body)
  );
}

async function waitForChallengeResolution(
  window: CloudflareChallengeWindow,
  timeoutMs: number,
): Promise<boolean> {
  const attempts = Math.ceil(timeoutMs / CHALLENGE_CHECK_INTERVAL);

  for (let i = 0; i < attempts; i++) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, CHALLENGE_CHECK_INTERVAL);
    });
    if (window.isDestroyed()) {
      throw new Error('Cloudflare challenge window was closed.');
    }
    const html = await window.webContents.executeJavaScript(
      'document.documentElement?.outerHTML ?? ""',
    );
    if (!isCloudflareChallengePage(html)) {
      return true;
    }
  }

  return false;
}

export async function resolveCloudflareChallenge(
  window: CloudflareChallengeWindow,
  options?: CloudflareChallengeOptions,
): Promise<boolean> {
  const resolvedInvisibly = await waitForChallengeResolution(
    window,
    INVISIBLE_CHALLENGE_TIMEOUT,
  );
  if (resolvedInvisibly) {
    return true;
  }

  if (!options?.openBrowserWindow) {
    return false;
  }

  window.show();
  window.focus();

  const resolvedInteractively = await waitForChallengeResolution(
    window,
    options.timeoutMs ?? DEFAULT_CLOUDFLARE_CHALLENGE_TIMEOUT,
  );
  if (resolvedInteractively) {
    return true;
  }

  throw new Error('Timed out waiting for the Cloudflare challenge.');
}

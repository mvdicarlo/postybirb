import { Logger } from '@postybirb/logger';

const logger = Logger('ProxyResolution');

export type ParsedProxySection = {
  type: string;
  hostname: string;
  port: string;
};

export function parseProxySection(section: string): ParsedProxySection | null {
  const trimmed = section.trim();
  if (!trimmed || trimmed.toUpperCase() === 'DIRECT') {
    return null;
  }

  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) {
    logger.withMetadata({ section: trimmed }).debug('parseProxySection skipped');
    return null;
  }

  const type = trimmed.slice(0, spaceIndex).trim();
  const proxyUrl = trimmed.slice(spaceIndex + 1).trim();
  if (!proxyUrl) {
    logger.withMetadata({ type }).debug('parseProxySection missing host/port');
    return null;
  }

  try {
    const parsed = new URL(
      proxyUrl.includes('://') ? proxyUrl : `http://${proxyUrl}`,
    );
    if (!parsed.hostname) {
      logger.withMetadata({ type, proxyUrl }).debug('parseProxySection empty host');
      return null;
    }

    return {
      type,
      hostname: parsed.hostname,
      port: parsed.port,
    };
  } catch {
    const hostPort = proxyUrl.match(/^([^:]+):(\d+)$/);
    if (hostPort) {
      return {
        type,
        hostname: hostPort[1],
        port: hostPort[2],
      };
    }
  }

  logger.withMetadata({ type, proxyUrl }).debug('parseProxySection failed');
  return null;
}

export function parseProxyResolution(resolution: string): ParsedProxySection[] {
  return resolution
    .split(';')
    .map((section) => parseProxySection(section))
    .filter((entry): entry is ParsedProxySection => entry !== null);
}

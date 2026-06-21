import type {
  ProxyConfiguration,
  ProxyMode,
  ProxyPoolEntry,
  ProxyType,
  ValidateProxyConfigurationResult,
} from './proxy-configuration.type';

const PROXY_MODES: ProxyMode[] = [
  'system',
  'direct',
  'fixed_servers',
  'pac_routing',
];

function isProxyMode(value: unknown): value is ProxyMode {
  return typeof value === 'string' && PROXY_MODES.includes(value as ProxyMode);
}

export function defaultProxyConfiguration(): ProxyConfiguration {
  return {
    mode: 'system',
    pool: [],
    routing: {},
  };
}

export function isProxyConfiguration(
  value: unknown,
): value is ProxyConfiguration {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (Array.isArray((value as { profiles?: unknown }).profiles)) {
    return false;
  }

  const candidate = value as ProxyConfiguration;
  return (
    isProxyMode(candidate.mode) &&
    Array.isArray(candidate.pool) &&
    typeof candidate.routing === 'object' &&
    candidate.routing !== null
  );
}

export function normalizeProxyPoolEntry(
  entry?: Partial<ProxyPoolEntry>,
): ProxyPoolEntry {
  const type: ProxyType =
    entry?.type === 'socks5' || entry?.type === 'http' ? entry.type : 'http';

  return {
    id: entry?.id?.trim() ?? '',
    label: entry?.label?.trim() || undefined,
    type,
    host: entry?.host?.trim() ?? '',
    port: entry?.port?.trim() ?? '',
    username: entry?.username?.trim() ?? '',
    password: entry?.password ?? '',
  };
}

export function normalizeProxyConfiguration(
  config?: Partial<ProxyConfiguration>,
): ProxyConfiguration {
  return {
    mode: isProxyMode(config?.mode) ? config.mode : 'system',
    pool: Array.isArray(config?.pool)
      ? config.pool.map((entry) => normalizeProxyPoolEntry(entry))
      : [],
    fixedProxyId: config?.fixedProxyId?.trim() || undefined,
    routing:
      config?.routing && typeof config.routing === 'object'
        ? { ...config.routing }
        : {},
    pacAccessToken: config?.pacAccessToken?.trim() || undefined,
  };
}

function parsePoolPort(port: string): number | null {
  const parsed = Number.parseInt(port.trim(), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return null;
  }

  return parsed;
}

export function validateProxyConfiguration(
  config: ProxyConfiguration,
): ValidateProxyConfigurationResult {
  const errors: string[] = [];
  const poolIds = new Set<string>();

  config.pool.forEach((entry, index) => {
    const label = entry.label || entry.id || `pool-${index + 1}`;

    if (!entry.id.trim()) {
      errors.push(`Pool entry "${label}" requires an id.`);
    } else if (poolIds.has(entry.id)) {
      errors.push(`Duplicate pool id "${entry.id}".`);
    } else {
      poolIds.add(entry.id);
    }

    if (!entry.host.trim()) {
      errors.push(`Pool entry "${label}" requires host.`);
    }

    if (parsePoolPort(entry.port) === null) {
      errors.push(
        `Pool entry "${label}" requires port between 1 and 65535.`,
      );
    }
  });

  if (config.mode === 'fixed_servers') {
    if (!config.fixedProxyId?.trim()) {
      errors.push('fixed_servers mode requires fixedProxyId.');
    } else if (!poolIds.has(config.fixedProxyId)) {
      errors.push(
        `fixedProxyId "${config.fixedProxyId}" does not match a pool entry.`,
      );
    }
  }

  Object.entries(config.routing).forEach(([websiteId, choice]) => {
    if (choice === 'direct' || choice === 'system') {
      return;
    }

    if (!poolIds.has(choice)) {
      errors.push(
        `Website "${websiteId}" routes to unknown pool id "${choice}".`,
      );
    }
  });

  return {
    ok: errors.length === 0,
    errors,
  };
}

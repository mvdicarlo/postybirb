import type {
  ProxyConfiguration,
  ProxyMode,
  ProxyPoolEntry,
  ProxyType,
  ProxyValidationIssue,
  ValidateProxyConfigurationOptions,
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

/** Keeps saved pool passwords when the client omits blank password fields on save. */
export function mergeProxyPoolPasswords(
  incoming: Partial<ProxyPoolEntry>[],
  saved: ProxyPoolEntry[],
): ProxyPoolEntry[] {
  return incoming.map((entry) => {
    const existing = saved.find((savedEntry) => savedEntry.id === entry.id);

    return normalizeProxyPoolEntry({
      ...entry,
      password: entry.password?.trim()
        ? entry.password
        : existing?.password ?? '',
    });
  });
}

function inferFixedProxyIdFromRouting(
  config: ProxyConfiguration,
): string | undefined {
  const poolIds = new Set(config.pool.map((entry) => entry.id));
  const usedPoolIds = new Set<string>();

  for (const choice of Object.values(config.routing)) {
    if (choice === 'direct' || choice === 'system') {
      continue;
    }

    if (poolIds.has(choice)) {
      usedPoolIds.add(choice);
    }
  }

  if (usedPoolIds.size === 1) {
    return [...usedPoolIds][0];
  }

  if (config.pool.length === 1 && config.pool[0]?.id) {
    return config.pool[0].id;
  }

  return undefined;
}

/** Drops mode-specific fields that must not affect runtime for the active mode. */
export function sanitizeProxyConfigurationForMode(
  config: ProxyConfiguration,
): ProxyConfiguration {
  switch (config.mode) {
    case 'fixed_servers': {
      const fixedProxyId =
        config.fixedProxyId?.trim() ||
        inferFixedProxyIdFromRouting(config);

      return {
        ...config,
        fixedProxyId,
        routing: {},
        pacAccessToken: undefined,
      };
    }
    case 'pac_routing':
      return {
        ...config,
        fixedProxyId: undefined,
      };
    case 'system':
    case 'direct':
      return {
        ...config,
        fixedProxyId: undefined,
        pacAccessToken: undefined,
      };
    default:
      return config;
  }
}

export function cloneProxyConfiguration(
  config: ProxyConfiguration,
): ProxyConfiguration {
  return {
    ...config,
    pool: config.pool.map((entry) => ({ ...entry })),
    routing: { ...config.routing },
  };
}

/** Trims fields and coerces types. Does not drop mode-specific properties. */
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

/** Normalize then drop fields that do not apply to the active mode. Use on load/save/apply. */
export function prepareProxyConfiguration(
  config?: Partial<ProxyConfiguration>,
): ProxyConfiguration {
  return sanitizeProxyConfigurationForMode(normalizeProxyConfiguration(config));
}

function parsePoolPort(port: string): number | null {
  const parsed = Number.parseInt(port.trim(), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return null;
  }

  return parsed;
}

function formatPoolEntryName(entry: ProxyPoolEntry, index: number): string {
  const label = entry.label?.trim();
  if (label) {
    return label;
  }

  return `Proxy ${index + 1}`;
}

function formatWebsiteName(
  websiteId: string,
  options?: ValidateProxyConfigurationOptions,
): string {
  return options?.websiteDisplayNames?.[websiteId]?.trim() || websiteId;
}

function pushIssue(
  issues: ProxyValidationIssue[],
  issue: ProxyValidationIssue,
): void {
  issues.push(issue);
}

export function validateProxyConfiguration(
  config: ProxyConfiguration,
  options?: ValidateProxyConfigurationOptions,
): ValidateProxyConfigurationResult {
  const issues: ProxyValidationIssue[] = [];
  const poolIds = new Set<string>();

  config.pool.forEach((entry, index) => {
    const name = formatPoolEntryName(entry, index);

    if (!entry.id.trim()) {
      pushIssue(issues, {
        message: `${name}: Proxy entry is invalid.`,
        entryId: entry.id || undefined,
      });
    } else if (poolIds.has(entry.id)) {
      pushIssue(issues, {
        message: `${name}: Duplicate proxy entry.`,
        entryId: entry.id,
      });
    } else {
      poolIds.add(entry.id);
    }

    if (!entry.host.trim()) {
      pushIssue(issues, {
        message: `${name}: Host is required.`,
        field: 'host',
        entryId: entry.id,
      });
    }

    if (parsePoolPort(entry.port) === null) {
      pushIssue(issues, {
        message: `${name}: Port must be a number between 1 and 65535.`,
        field: 'port',
        entryId: entry.id,
      });
    }
  });

  if (config.mode === 'fixed_servers') {
    if (!config.fixedProxyId?.trim()) {
      pushIssue(issues, {
        message: 'Select a proxy for all traffic.',
        field: 'fixedProxyId',
      });
    } else if (!poolIds.has(config.fixedProxyId)) {
      pushIssue(issues, {
        message:
          'The selected proxy is no longer in the pool. Choose another one.',
        field: 'fixedProxyId',
      });
    }
  }

  if (config.mode === 'pac_routing') {
    Object.entries(config.routing).forEach(([websiteId, choice]) => {
      if (choice === 'direct' || choice === 'system') {
        return;
      }

      if (!poolIds.has(choice)) {
        const websiteName = formatWebsiteName(websiteId, options);
        pushIssue(issues, {
          message: `${websiteName}: Selected proxy is missing from the pool.`,
          field: 'routing',
          websiteId,
        });
      }
    });
  }

  return {
    ok: issues.length === 0,
    errors: issues.map((issue) => issue.message),
    issues,
  };
}

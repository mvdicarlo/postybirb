import { ProxyConfiguration, ProxyProfile } from './proxy-settings';

export type ValidateProfilesResult = {
  ok: boolean;
  errors: string[];
};

const PROXY_LOG_LEVEL = (process.env.LOG_LEVEL ?? 'debug').toLowerCase();

function resolverDebug(
  message: string,
  context?: Record<string, unknown>,
): void {
  if (PROXY_LOG_LEVEL === 'error' || PROXY_LOG_LEVEL === 'warn') {
    return;
  }

  if (context) {
    // eslint-disable-next-line no-console
    console.debug(message, context);
    return;
  }

  // eslint-disable-next-line no-console
  console.debug(message);
}

function resolverWarn(
  message: string,
  context?: Record<string, unknown>,
): void {
  if (PROXY_LOG_LEVEL === 'error') {
    return;
  }

  if (context) {
    // eslint-disable-next-line no-console
    console.warn(message, context);
    return;
  }

  // eslint-disable-next-line no-console
  console.warn(message);
}

function parsePort(port: string): number | null {
  const parsed = Number.parseInt(port.trim(), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return null;
  }

  return parsed;
}

export function validateProfiles(
  profiles: ProxyProfile[],
): ValidateProfilesResult {
  const errors: string[] = [];
  const websiteOwners = new Map<string, string>();
  let wildcardProfileId: string | null = null;

  profiles.forEach((profile, index) => {
    const label = profile.label || profile.id || `profile-${index + 1}`;

    if (profile.enabled) {
      if (!profile.host.trim()) {
        errors.push(`Profile "${label}" requires host when enabled.`);
      }

      if (parsePort(profile.port) === null) {
        errors.push(
          `Profile "${label}" requires port between 1 and 65535 when enabled.`,
        );
      }

      if (
        profile.websites.length === 0 &&
        profile.host.trim() &&
        parsePort(profile.port) !== null
      ) {
        if (wildcardProfileId && wildcardProfileId !== profile.id) {
          errors.push(
            'Only one enabled profile can apply to all websites (leave Websites empty).',
          );
        } else {
          wildcardProfileId = profile.id;
        }
      }
    }

    profile.websites.forEach((websiteId) => {
      const owner = websiteOwners.get(websiteId);
      if (owner && owner !== profile.id) {
        errors.push(
          `Website "${websiteId}" is assigned to multiple profiles (${owner}, ${profile.id}).`,
        );
        return;
      }

      websiteOwners.set(websiteId, profile.id);
    });
  });

  if (errors.length > 0) {
    resolverWarn('[ProxyResolver.validate] Proxy profile validation failed', {
      errors,
    });
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

function isResolvableProfile(profile: ProxyProfile): boolean {
  return (
    profile.enabled &&
    profile.host.length > 0 &&
    parsePort(profile.port) !== null
  );
}

export function resolveProfileForWebsite(
  websiteId: string,
  config: ProxyConfiguration,
): ProxyProfile | null {
  const explicitMatch = config.profiles.find(
    (profile) =>
      isResolvableProfile(profile) && profile.websites.includes(websiteId),
  );
  if (explicitMatch) {
    resolverDebug('[ProxyResolver.resolve]', {
      websiteId,
      profileId: explicitMatch.id,
      enabled: explicitMatch.enabled,
      match: 'explicit',
    });
    return explicitMatch;
  }

  const wildcardMatch = config.profiles.find(
    (profile) => isResolvableProfile(profile) && profile.websites.length === 0,
  );

  resolverDebug('[ProxyResolver.resolve]', {
    websiteId,
    profileId: wildcardMatch?.id ?? null,
    enabled: wildcardMatch?.enabled ?? false,
    match: wildcardMatch ? 'all-websites' : null,
  });

  return wildcardMatch ?? null;
}

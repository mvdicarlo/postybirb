import type { ProxyPoolEntry, ProxyProfile } from '@postybirb/types';

export function buildProxyRules(profile: ProxyProfile): string {
  if (!profile.enabled || !profile.host || !profile.port) {
    return '';
  }

  if (profile.type === 'socks5') {
    return `socks5://${profile.host}:${profile.port}`;
  }

  const auth =
    profile.username.length > 0
      ? `${encodeURIComponent(profile.username)}:${encodeURIComponent(
          profile.password,
        )}@`
      : '';

  return `${profile.type}://${auth}${profile.host}:${profile.port}`;
}

export function buildSessionProxyRules(profile: ProxyProfile): string {
  if (!profile.enabled || !profile.host || !profile.port) {
    return '';
  }

  if (profile.type === 'socks5') {
    return `socks5://${profile.host}:${profile.port}`;
  }

  return `http=${profile.host}:${profile.port};https=${profile.host}:${profile.port}`;
}

export function toEnabledProxyProfile(entry: ProxyPoolEntry): ProxyProfile {
  return {
    ...entry,
    enabled: true,
  };
}

export function buildProxyAgentUrl(
  profile?: ProxyProfile | null,
): string | null {
  if (!profile) {
    return null;
  }

  const rules = buildProxyRules(profile);
  return rules.length > 0 ? rules : null;
}

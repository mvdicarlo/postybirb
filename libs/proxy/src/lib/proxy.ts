import type { ProxyPoolEntry, ProxyProfile } from '@postybirb/types';

function normalizeProxyProfile(
  profile: ProxyProfile | ProxyPoolEntry | null | undefined,
): ProxyProfile | null {
  if (!profile) {
    return null;
  }

  return {
    ...profile,
    enabled: true,
  };
}

function hasProxyEndpoint(profile: ProxyProfile): boolean {
  return profile.enabled && Boolean(profile.host && profile.port);
}

function buildSocksProxyRules(profile: ProxyProfile): string {
  return `socks5://${profile.host}:${profile.port}`;
}

function buildHttpProxyRules(profile: ProxyProfile): string {
  const auth =
    profile.username.length > 0
      ? `${encodeURIComponent(profile.username)}:${encodeURIComponent(
          profile.password,
        )}@`
      : '';

  return `${profile.type}://${auth}${profile.host}:${profile.port}`;
}

function buildSessionHttpProxyRules(profile: ProxyProfile): string {
  return `http=${profile.host}:${profile.port};https=${profile.host}:${profile.port}`;
}

export function buildProxyRules(
  profile: ProxyProfile | ProxyPoolEntry | null | undefined,
): string {
  const normalized = normalizeProxyProfile(profile);
  if (!normalized || !hasProxyEndpoint(normalized)) {
    return '';
  }

  if (normalized.type === 'socks5') {
    return buildSocksProxyRules(normalized);
  }

  return buildHttpProxyRules(normalized);
}

export function buildSessionProxyRules(
  profile: ProxyProfile | ProxyPoolEntry | null | undefined,
): string {
  const normalized = normalizeProxyProfile(profile);
  if (!normalized || !hasProxyEndpoint(normalized)) {
    return '';
  }

  if (normalized.type === 'socks5') {
    return buildSocksProxyRules(normalized);
  }

  return buildSessionHttpProxyRules(normalized);
}

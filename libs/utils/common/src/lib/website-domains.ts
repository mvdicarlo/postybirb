/**
 * Hostname helpers for automatic PAC domain aggregation.
 */
export function extractHostname(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(
      trimmed.includes('://') ? trimmed : `https://${trimmed}`,
    );
    const host = parsed.hostname.trim().toLowerCase();
    return host.length > 0 ? host : null;
  } catch {
    const hostPort = trimmed.match(/^([^:/]+)(?::\d+)?(?:\/.*)?$/);
    const host = hostPort?.[1]?.trim().toLowerCase();
    return host && host.length > 0 ? host : null;
  }
}

export function normalizeDomain(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, '');
}

export function mergeDomainLists(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  lists.forEach((list) => {
    list.forEach((entry) => {
      const normalized = normalizeDomain(entry);
      if (!normalized || seen.has(normalized)) {
        return;
      }

      seen.add(normalized);
      merged.push(normalized);
    });
  });

  return merged;
}

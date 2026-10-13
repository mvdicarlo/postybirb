import { validate, version } from 'uuid';

export const TELEMETRY_SCHEMA_VERSION = '2';

const PROPERTY_NAMES = new Set([
  'source',
  'type',
  'website',
  'submissionType',
  'stage',
  'method',
  'statusCode',
  'hasError',
  'childType',
  'reason',
  'exitCode',
  'level',
  'component',
]);

export function isTelemetryInstallationId(value: unknown): value is string {
  return typeof value === 'string' && validate(value) && version(value) === 4;
}

export function stripLocalPaths(text: string): string {
  return text
    .replace(
      /(['"])(?:file:\/\/\/|[a-z]:[\\/]|\\\\|\/(?:Users|home|root|tmp|var|private|opt|etc|mnt|media|Volumes|Applications|usr|app|data|workspace|srv|run|snap)\/)[^'"\r\n]*\1/gi,
      '$1[local-path]$1',
    )
    .replace(
      /(\b(?:open|scandir|stat|lstat|unlink|mkdir|rmdir|readlink|rename|chdir|copyfile)\s+)(['"])\/[^'"\r\n]*\2/gi,
      '$1$2[local-path]$2',
    )
    .replace(
      /(?<!\w)(?:file:\/\/\/(?:[a-z]:[\\/])?|[a-z]:[\\/]|\\\\[^\\/\s]+[\\/])(?:[^<>:"'|?*()\r\n]+[\\/])*[^<>"'|?*()\s\r\n:,]+/gi,
      '[local-path]',
    )
    .replace(
      /(?<![\w:/])\/(?:Users|home|root|tmp|var|private|opt|etc|mnt|media|Volumes|Applications|usr|app|data|workspace|srv|run|snap)\/(?:[^"'()\r\n]+\/)*[^"'()\s\r\n:,]+/g,
      '[local-path]',
    );
}

export function sanitizeError(error: Error): Error {
  const sanitized = new Error(stripLocalPaths(error.message));
  sanitized.name = error.name;
  sanitized.stack = error.stack
    ?.split(/\r?\n/)
    .map((line) => {
      if (!/^\s*at\s|@(?:file:|https?:|[a-z]:[\\/]|\/)/i.test(line)) {
        return stripLocalPaths(line);
      }

      const frame = line.replace(
        /(?<![\w:/.])(?:file:\/\/\/|https?:\/\/|[a-z]:[\\/]|\\\\|\/)[^()\r\n]*?:\d+(?::\d+)?(?=\)?\s*$)/gi,
        (location) => {
          const filename = location.split(/[\\/]/).pop() ?? '';
          return filename.replace(/[?#].*?(?=:\d+(?::\d+)?$)/, '');
        },
      );
      return stripLocalPaths(frame);
    })
    .join('\n');
  return sanitized;
}

export function filterTelemetryProperties(
  properties?: Record<string, unknown>,
): Record<string, string> {
  const filtered: Record<string, string> = {
    telemetrySchemaVersion: TELEMETRY_SCHEMA_VERSION,
  };
  Object.entries(properties ?? {}).forEach(([name, value]) => {
    if (
      PROPERTY_NAMES.has(name) &&
      (typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean')
    ) {
      filtered[name] = stripLocalPaths(String(value));
    }
  });
  return filtered;
}

export function anonymizeDependencyTarget(target: string): string {
  const hostname = new URL(target).hostname.toLowerCase();
  if (
    !hostname.includes('.') ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.includes(':') ||
    /^[\d.]+$/.test(hostname)
  ) {
    return 'private-host';
  }
  return hostname;
}

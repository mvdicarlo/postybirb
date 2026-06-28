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

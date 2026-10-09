export function toError(value: unknown) {
  if (value instanceof Error) return value;
  if (value && typeof value === 'object')
    return new Error(JSON.stringify(value));

  return new Error(String(value));
}

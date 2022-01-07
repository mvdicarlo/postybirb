import { setInterval } from 'timers/promises';

export async function waitUntil(
  fn: () => boolean,
  milliseconds: number
): Promise<void> {
  const interval = setInterval(milliseconds);

  // eslint-disable-next-line no-restricted-syntax, @typescript-eslint/no-unused-vars
  for await (const i of interval) {
    if (fn()) {
      break;
    }
  }
}

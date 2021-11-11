import { setInterval } from 'timers/promises';

export async function waitUntil(
  fn: () => boolean,
  milliseconds: number
): Promise<void> {
  const interval = setInterval(milliseconds);

  for await (const i of interval) {
    if (fn()) {
      break;
    }
  }
}

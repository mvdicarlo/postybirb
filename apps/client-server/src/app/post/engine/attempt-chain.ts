import { RelayJob } from './model';

export class AttemptChainError extends Error {}

export function resolveAttemptChain(
  newest: RelayJob,
  history: readonly RelayJob[],
): RelayJob[] {
  const jobsById = new Map(history.map((job) => [job.id, job]));
  const seen = new Set<string>();
  const chain: RelayJob[] = [];

  let current: RelayJob | undefined = newest;
  while (current) {
    if (seen.has(current.id)) {
      throw new AttemptChainError(
        `Cyclic Relay attempt chain at ${current.id}`,
      );
    }
    seen.add(current.id);
    chain.push(current);

    if (!current.attemptOf) break;
    const parent = jobsById.get(current.attemptOf);
    if (!parent) {
      throw new AttemptChainError(
        `Incomplete Relay attempt chain: missing ${current.attemptOf}`,
      );
    }
    current = parent;
  }

  return chain;
}

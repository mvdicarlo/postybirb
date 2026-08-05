import { IUnitOfWork } from '@postybirb/types';

type RateLimitedUnit = Pick<
  IUnitOfWork,
  'accountId' | 'batch' | 'rateLimitedUntil'
>;

export interface PartitionedUnitsOfWork<T extends RateLimitedUnit> {
  ready: T[];
  deferred: T[];
}

export function partitionUnitsOfWorkByRateLimit<T extends RateLimitedUnit>(
  units: readonly T[],
  now = Date.now(),
): PartitionedUnitsOfWork<T> {
  const batches = new Map<string, T[]>();

  for (const unit of units) {
    const key = JSON.stringify([unit.accountId, unit.batch ?? null]);
    const batch = batches.get(key) ?? [];
    batch.push(unit);
    batches.set(key, batch);
  }

  const ready: T[] = [];
  const deferred: T[] = [];
  for (const batch of batches.values()) {
    const isDeferred = batch.some((unit) => {
      if (!unit.rateLimitedUntil) {
        return false;
      }
      const expiresAt = Date.parse(unit.rateLimitedUntil);
      return Number.isFinite(expiresAt) && expiresAt > now;
    });
    (isDeferred ? deferred : ready).push(...batch);
  }

  return { ready, deferred };
}
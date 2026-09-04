import { IUnitOfWork, UnitOfWorkState } from '@postybirb/types';

type RateLimitedUnit = Pick<
  IUnitOfWork,
  'accountId' | 'batch' | 'rateLimitedUntil'
>;

export interface PartitionedUnitsOfWork<T extends RateLimitedUnit> {
  ready: T[];
  deferred: T[];
}

export async function filterSourceDependentWork<T extends RateLimitedUnit>(
  ready: readonly T[],
  deferred: readonly T[],
  acceptsExternalSourceUrls: (accountId: string) => Promise<boolean>,
): Promise<T[]> {
  if (deferred.length === 0) {
    return [...ready];
  }

  const deferredAccountIds = [
    ...new Set(deferred.map((unit) => unit.accountId)),
  ];
  const deferredAccountTypes = await Promise.all(
    deferredAccountIds.map((accountId) =>
      acceptsExternalSourceUrls(accountId),
    ),
  );
  if (deferredAccountTypes.every(Boolean)) {
    return [...ready];
  }

  const readyAccountIds = [...new Set(ready.map((unit) => unit.accountId))];
  const readyAccountTypes = await Promise.all(
    readyAccountIds.map(async (accountId) => [
      accountId,
      await acceptsExternalSourceUrls(accountId),
    ] as const),
  );
  const externalSourceAccounts = new Set(
    readyAccountTypes.flatMap(([accountId, acceptsExternalSources]) =>
      acceptsExternalSources ? [accountId] : [],
    ),
  );
  return ready.filter(
    (unit) => !externalSourceAccounts.has(unit.accountId),
  );
}

/**
 * Units that may run right now: not rate limited, and not depending on a
 * source producer that is still deferred.
 */
export async function selectExecutableWork<T extends RateLimitedUnit>(
  units: readonly T[],
  acceptsExternalSourceUrls: (accountId: string) => Promise<boolean>,
): Promise<T[]> {
  const { ready, deferred } = partitionUnitsOfWorkByRateLimit(units);
  return filterSourceDependentWork(ready, deferred, acceptsExternalSourceUrls);
}

export function isUnitOfWorkAttemptSettled(
  unit: Pick<IUnitOfWork, 'state'>,
): boolean {
  return (
    unit.state === UnitOfWorkState.SUCCEEDED ||
    unit.state === UnitOfWorkState.FAILED ||
    unit.state === UnitOfWorkState.CANCELLED
  );
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
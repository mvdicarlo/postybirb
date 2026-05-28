import type { EntityId } from '@postybirb/types';

/**
 * Assert that every key on a row appears on a hydrated entity with the
 * same value. Relation keys (typed as arrays or nested objects) are
 * skipped by default — pass them in `relationKeys` so they can be
 * structurally checked by the caller instead.
 *
 * The helper is intentionally minimal — it exists so per-entity specs
 * can satisfy the §4 "every scalar column round-trips" coverage
 * requirement without each spec repeating the same loop.
 */
export function assertRowRoundtrips<
  R extends { id: EntityId },
  E extends { id: EntityId } & Record<string, unknown>,
>(
  row: R,
  entity: E,
  relationKeys: readonly (keyof R)[] = [],
): void {
  const skip = new Set<string>(relationKeys.map((k) => String(k)));
  for (const key of Object.keys(row) as Array<keyof R & string>) {
    if (skip.has(key)) continue;
    expect(entity[key as keyof E]).toEqual(row[key]);
  }
}

import { Logger } from '@postybirb/logger';
import type { EntityId } from '@postybirb/types';
import type { SchemaKey } from '../../helper-types';
import type { Action, SubscriberCb } from './types';

const ACTION_ORDER: readonly Action[] = ['insert', 'update', 'delete'];

interface PendingBucket {
  /** Insertion-ordered ids with duplicates removed. */
  ids: EntityId[];
  /** Dedup set kept in lockstep with `ids`. */
  seen: Set<EntityId>;
}

/**
 * In-process publish/subscribe bus for repository write notifications.
 *
 * Replaces the legacy `PostyBirbDatabase.subscribers` map. Two important
 * differences:
 *
 *  1. `notify` is **coalesced** through `queueMicrotask`. Multiple `notify`
 *     calls for the same `(schemaKey, action)` within a single tick are
 *     collapsed to a single subscriber invocation carrying the union of
 *     ids. This eliminates the N-emit-per-loop pattern of the legacy
 *     wrapper without changing observable semantics for any caller that
 *     already `await`s between writes.
 *  2. Subscriber callbacks receive `schemaKey` as a third argument. Old
 *     two-argument callbacks continue to type-check because the extra
 *     positional argument is optional from the caller's perspective.
 *
 * Use `notifyImmediate` to bypass coalescing — required by
 * `TransactionContext.commit()` (which is itself a coalescing point) and
 * useful for tests.
 */
export class SubscriberBus {
  private static readonly logger = Logger('SubscriberBus');

  private static readonly subscribers = new Map<
    SchemaKey,
    Set<SubscriberCb>
  >();

  /**
   * Pending notifications, snapshotted by `drain` into a fresh map before
   * subscribers run. Re-entrant `notify` calls from inside a draining
   * subscriber go into the new (empty) map and schedule a fresh microtask.
   */
  private static pending = new Map<SchemaKey, Map<Action, PendingBucket>>();

  private static drainScheduled = false;

  public static subscribe(
    keys: SchemaKey | SchemaKey[],
    cb: SubscriberCb,
  ): void {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const key of list) {
      let bucket = SubscriberBus.subscribers.get(key);
      if (!bucket) {
        bucket = new Set();
        SubscriberBus.subscribers.set(key, bucket);
      }
      bucket.add(cb);
    }
  }

  public static unsubscribe(
    keys: SchemaKey | SchemaKey[],
    cb: SubscriberCb,
  ): void {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const key of list) {
      const bucket = SubscriberBus.subscribers.get(key);
      if (bucket) {
        bucket.delete(cb);
      }
    }
  }

  /**
   * Append `(ids, action)` to the pending bucket for `key` and schedule a
   * microtask drain if one is not already pending.
   */
  public static notify(
    key: SchemaKey,
    ids: EntityId[],
    action: Action,
  ): void {
    if (ids.length === 0) {
      return;
    }
    SubscriberBus.appendPending(key, action, ids);
    SubscriberBus.scheduleDrain();
  }

  /**
   * Fire subscribers synchronously, bypassing the coalescing queue. Does
   * NOT interact with pending buckets.
   */
  public static notifyImmediate(
    key: SchemaKey,
    ids: EntityId[],
    action: Action,
  ): void {
    if (ids.length === 0) {
      return;
    }
    SubscriberBus.invokeSubscribers(key, ids, action);
  }

  /**
   * Drain any pending coalesced notifications synchronously. Intended for
   * tests so specs do not need `await Promise.resolve()` ceremony.
   */
  public static flush(): void {
    SubscriberBus.drain();
  }

  /**
   * Remove all subscribers and pending notifications. Test helper.
   */
  public static clear(): void {
    SubscriberBus.subscribers.clear();
    SubscriberBus.pending = new Map();
    SubscriberBus.drainScheduled = false;
  }

  private static appendPending(
    key: SchemaKey,
    action: Action,
    ids: EntityId[],
  ): void {
    let byAction = SubscriberBus.pending.get(key);
    if (!byAction) {
      byAction = new Map();
      SubscriberBus.pending.set(key, byAction);
    }
    let bucket = byAction.get(action);
    if (!bucket) {
      bucket = { ids: [], seen: new Set() };
      byAction.set(action, bucket);
    }
    for (const id of ids) {
      if (!bucket.seen.has(id)) {
        bucket.seen.add(id);
        bucket.ids.push(id);
      }
    }
  }

  private static scheduleDrain(): void {
    if (SubscriberBus.drainScheduled) {
      return;
    }
    SubscriberBus.drainScheduled = true;
    queueMicrotask(() => SubscriberBus.drain());
  }

  private static drain(): void {
    // Snapshot and clear FIRST so re-entrant notify calls from inside a
    // subscriber go into a fresh pending map and schedule their own
    // microtask, rather than appending to the bucket being drained.
    const snapshot = SubscriberBus.pending;
    SubscriberBus.pending = new Map();
    SubscriberBus.drainScheduled = false;

    for (const [key, byAction] of snapshot) {
      for (const action of ACTION_ORDER) {
        const bucket = byAction.get(action);
        if (!bucket || bucket.ids.length === 0) {
          continue;
        }
        SubscriberBus.invokeSubscribers(key, bucket.ids, action);
      }
    }
  }

  private static invokeSubscribers(
    key: SchemaKey,
    ids: EntityId[],
    action: Action,
  ): void {
    const subs = SubscriberBus.subscribers.get(key);
    if (!subs || subs.size === 0) {
      return;
    }
    // Iterate a snapshot so a subscriber that unsubscribes during invocation
    // does not perturb iteration order.
    const snapshot = Array.from(subs);
    for (const cb of snapshot) {
      try {
        cb(ids, action, key);
      } catch (err) {
        SubscriberBus.logger.error(
          `Subscriber for ${String(key)}/${action} threw: ${
            (err as Error).message
          }`,
          (err as Error).stack,
        );
      }
    }
  }
}

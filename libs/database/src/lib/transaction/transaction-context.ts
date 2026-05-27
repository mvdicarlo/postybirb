import { Logger } from '@postybirb/logger';
import type { EntityId } from '@postybirb/types';
import { eq } from 'drizzle-orm';
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { PostyBirbDatabaseType } from '../database';
import type { SchemaKey } from '../helper-types';
import { SubscriberBus } from '../repositories/base/subscriber-bus';
import * as schemas from '../schemas';

interface TrackedEntity {
  schemaKey: SchemaKey;
  id: EntityId;
}

/**
 * A transaction-like wrapper that tracks created entities and provides
 * automatic cleanup on failure. This works around drizzle-orm's synchronous
 * transaction requirement with better-sqlite3.
 *
 * Lib-local replacement for the legacy
 * `apps/client-server/src/app/drizzle/transaction-context.ts`. Behavioural
 * parity is preserved with one structural change: `commit()` broadcasts
 * through `SubscriberBus.notifyImmediate(...)` instead of the legacy
 * `PostyBirbDatabase.notifySubscribers(...)` static hook. The bus is the
 * single notification authority in the new architecture (see migration
 * spec §5).
 */
export class TransactionContext {
  private readonly logger = Logger();

  private readonly createdEntities: TrackedEntity[] = [];

  private readonly db: PostyBirbDatabaseType;

  constructor(db: PostyBirbDatabaseType) {
    this.db = db;
  }

  /**
   * Track an entity that was created during this operation. If the
   * operation later fails, the entity is deleted by `cleanup()`.
   */
  track(schemaKey: SchemaKey, id: EntityId): void {
    this.createdEntities.push({ schemaKey, id });
  }

  /**
   * Track multiple entities of the same schema created during this
   * operation.
   */
  trackMany(schemaKey: SchemaKey, ids: EntityId[]): void {
    ids.forEach((id) => this.track(schemaKey, id));
  }

  /**
   * Get the database instance for performing operations.
   */
  getDb(): PostyBirbDatabaseType {
    return this.db;
  }

  /**
   * Cleanup all tracked entities in reverse order (LIFO). Called
   * automatically by `withTransactionContext` when the operation throws.
   * Errors during individual deletes are logged but do not abort the
   * remaining cleanup.
   */
  async cleanup(): Promise<void> {
    this.logger.warn(
      `Rolling back transaction: cleaning up ${this.createdEntities.length} entities`,
    );

    const entities = [...this.createdEntities].reverse();

    for (const { schemaKey, id } of entities) {
      try {
        const table = (schemas as Record<string, unknown>)[
          schemaKey as string
        ] as { id: AnySQLiteColumn };
        await this.db
          .delete(table as never)
          .where(eq(table.id, id));
        this.logger.debug(`Cleaned up ${String(schemaKey)} entity: ${id}`);
      } catch (err) {
        this.logger.error(
          `Failed to cleanup ${String(schemaKey)} entity ${id}: ${
            (err as Error).message
          }`,
          (err as Error).stack,
        );
      }
    }
  }

  /**
   * Clear tracked entities and notify subscribers (called on successful
   * completion). Tracks only inserts today; the bus is invoked
   * synchronously via `notifyImmediate` so consumers observing the result
   * of a transaction see the write before control returns.
   *
   * NOTE: If update/delete tracking is needed in the future, add
   * `trackUpdate()` and `trackDelete()` methods that store the action type
   * alongside the entity.
   */
  commit(): void {
    const bySchema = new Map<SchemaKey, EntityId[]>();
    for (const { schemaKey, id } of this.createdEntities) {
      const existing = bySchema.get(schemaKey);
      if (existing) {
        existing.push(id);
      } else {
        bySchema.set(schemaKey, [id]);
      }
    }

    for (const [schemaKey, ids] of bySchema) {
      SubscriberBus.notifyImmediate(schemaKey, ids, 'insert');
    }

    this.createdEntities.length = 0;
  }
}

/**
 * Execute an operation with automatic cleanup on failure. On success,
 * `commit()` broadcasts inserts synchronously through `SubscriberBus`.
 *
 * @example
 * ```typescript
 * const result = await withTransactionContext(
 *   this.fileRepository.db,
 *   async (ctx) => {
 *     const entity = await createEntity(...);
 *     ctx.track('SubmissionFileSchema', entity.id);
 *
 *     const buffer = await createBuffer(...);
 *     ctx.track('FileBufferSchema', buffer.id);
 *
 *     return entity;
 *   }
 * );
 * ```
 */
export async function withTransactionContext<T>(
  db: PostyBirbDatabaseType,
  operation: (ctx: TransactionContext) => Promise<T>,
): Promise<T> {
  const ctx = new TransactionContext(db);

  try {
    const result = await operation(ctx);
    ctx.commit();
    return result;
  } catch (err) {
    await ctx.cleanup();
    throw err;
  }
}

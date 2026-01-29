import type { PostyBirbDatabaseType, SchemaKey } from '@postybirb/database';
import { Schemas } from '@postybirb/database';
import { Logger } from '@postybirb/logger';
import { EntityId } from '@postybirb/types';
import { eq } from 'drizzle-orm';
import { PostyBirbDatabase } from './postybirb-database/postybirb-database';

interface TrackedEntity {
  schemaKey: SchemaKey;
  id: EntityId;
}

/**
 * A transaction-like wrapper that tracks created entities and provides
 * automatic cleanup on failure. This works around drizzle-orm's synchronous
 * transaction requirement with better-sqlite3.
 */
export class TransactionContext {
  private readonly logger = Logger();

  private readonly createdEntities: TrackedEntity[] = [];

  private readonly db: PostyBirbDatabaseType;

  constructor(db: PostyBirbDatabaseType) {
    this.db = db;
  }

  /**
   * Track an entity that was created during this operation.
   * If the operation fails, this entity will be deleted.
   */
  track(schemaKey: SchemaKey, id: EntityId): void {
    this.createdEntities.push({ schemaKey, id });
  }

  /**
   * Track multiple entities that were created during this operation.
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
   * Cleanup all tracked entities in reverse order (LIFO).
   * This is called automatically on failure.
   */
  async cleanup(): Promise<void> {
    this.logger.warn(
      `Rolling back transaction: cleaning up ${this.createdEntities.length} entities`,
    );

    // Delete in reverse order (most recently created first)
    const entities = [...this.createdEntities].reverse();

    for (const { schemaKey, id } of entities) {
      try {
        const schema = Schemas[schemaKey];
        await this.db.delete(schema).where(eq(schema.id, id));
        this.logger.debug(`Cleaned up ${String(schemaKey)} entity: ${id}`);
      } catch (err) {
        this.logger.error(
          `Failed to cleanup ${String(schemaKey)} entity ${id}: ${err.message}`,
          err.stack,
        );
      }
    }
  }

  /**
   * Clear tracked entities and notify subscribers (called on successful completion).
   *
   * NOTE: Currently only tracks inserts. If update/delete tracking is needed in the future,
   * add trackUpdate() and trackDelete() methods that store the action type alongside the entity.
   */
  commit(): void {
    // Group tracked entities by schemaKey
    const bySchema = new Map<SchemaKey, EntityId[]>();
    for (const { schemaKey, id } of this.createdEntities) {
      const existing = bySchema.get(schemaKey);
      if (existing) {
        existing.push(id);
      } else {
        bySchema.set(schemaKey, [id]);
      }
    }

    // Notify subscribers for each schema
    for (const [schemaKey, ids] of bySchema) {
      PostyBirbDatabase.notifySubscribers(schemaKey, ids, 'insert');
    }

    this.createdEntities.length = 0;
  }
}

/**
 * Execute an operation with automatic cleanup on failure.
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

import type { EntityId, IEntity, IEntityDto } from '@postybirb/types';
import { v4 } from 'uuid';
import type { SchemaKey } from '../helper-types';

/**
 * Lib-local replacement for
 * `apps/client-server/src/app/drizzle/models/database-entity.ts`.
 *
 * Key differences vs the legacy base:
 *
 * - **No `class-transformer` imports.** Lib entities hydrate exclusively
 *   through `static fromRow(row, ctx?)` / `static fromRows(rows, ctx?)`
 *   defined per entity. The legacy `fromDatabaseRecord(...)` helper and
 *   the `@Type` / `@Exclude` decorator pattern are NOT carried over here.
 *   They survive in the legacy `apps/client-server` copy until that
 *   folder is deleted in Phase E.
 *
 * - **Generic over the entity interface (`T extends IEntity`).** The
 *   constructor accepts `Partial<T>`, so concrete subclasses do NOT need
 *   to override the constructor just to widen the parameter type. The
 *   legacy pattern (subclass calls `super(entity)` then redundantly
 *   `Object.assign(this, entity)` a second time) is gone — the base
 *   does it once, correctly.
 *
 * - **Abstract `entitySchemaKey` field.** Concrete subclasses declare
 *   this as a `readonly` class field (e.g.
 *   `readonly entitySchemaKey = 'AccountSchema' as const`). TypeScript
 *   guarantees every concrete subclass sets it. Used by
 *   `RepositoryRegistry.getFor(entity)` to resolve the owning repository
 *   without a separate map.
 *
 * - **`toObject()` returns `T`** so the inherited signature is honest
 *   for downstream callers; subclasses no longer need to override the
 *   declared return type.
 */
export abstract class DatabaseEntity<
  T extends IEntity = IEntity,
> implements IEntity {
  public readonly id: EntityId;

  /**
   * Populated by drizzle on insert/select via the `CommonSchema()` helper.
   * Marked with the definite-assignment assertion because the value never
   * originates from `new Entity()` construction in app code — it is always
   * either present on the input row or filled in by the DB layer before
   * the entity is exposed.
   */
  public createdAt!: string;

  /** See `createdAt` for the assertion rationale. */
  public updatedAt!: string;

  /**
   * The schema key that owns this entity. Declared as an abstract
   * class field — concrete subclasses MUST set it as a `readonly`
   * field so it is part of the prototype shape and cannot be forgotten.
   * NOTE: abstract field initializers run AFTER the base constructor,
   * so do not read this from within `DatabaseEntity`'s constructor.
   */
  public abstract readonly entitySchemaKey: SchemaKey;

  constructor(entity: Partial<T> = {}) {
    // Assign `id` first and explicitly so TS sees a definite assignment
    // on the `readonly` field, then layer the remaining columns via
    // Object.assign for ergonomic spread-style construction in `fromRow`.
    this.id = entity.id ?? v4();
    this.createdAt = entity.createdAt ?? new Date().toISOString();
    this.updatedAt = entity.updatedAt ?? new Date().toISOString();
    Object.assign(this, entity);
  }

  public abstract toObject(): T;

  public abstract toDTO(): IEntityDto;

  public toJSON(): string {
    return JSON.stringify(this.toDTO());
  }
}

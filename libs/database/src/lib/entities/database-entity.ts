import type { EntityId, IEntity, IEntityDto } from '@postybirb/types';
import { v4 } from 'uuid';
import type { SchemaKey } from '../helper-types';
import { HydrationContext } from '../repositories/base/hydration-context';

/**
 * Abstract base for all database entities in `libs/database`.
 *
 * Construction rules:
 *
 * - The base assigns only `id`, `createdAt`, and `updatedAt`. Concrete
 *   subclasses MUST assign every column-backed field explicitly in their
 *   own constructor body.
 * - `entitySchemaKey` is set via `Object.defineProperty` in each
 *   subclass constructor (non-enumerable) so it never leaks through
 *   `{ ...entity }`, `Object.keys`, JSON serialization, or drizzle
 *   insert payloads.
 * - Entities hydrate exclusively through `static fromRow(row, ctx?)` /
 *   `static fromRows(rows, ctx?)` defined on each concrete class.
 * - `toObject()` returns an explicit object literal of type `T` so the
 *   signature is honest and no class-field metadata leaks.
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
   * The schema key that owns this entity. Subclasses set this via
   * `Object.defineProperty(this, 'entitySchemaKey', { value: 'XSchema' })`
   * in their constructor so it is NON-ENUMERABLE and never leaks into
   * `toObject` / `toDTO` / drizzle insert payloads. The declared type
   * is `SchemaKey` for ergonomics; concrete subclasses narrow it to a
   * literal via the cast.
   */
  public abstract readonly entitySchemaKey: SchemaKey;

  constructor(entity: Partial<IEntity> = {}) {
    // Assign `id` first and explicitly so TS sees a definite assignment
    // on the `readonly` field. createdAt/updatedAt likewise get defaulted
    // here so subclasses don't need to. Concrete column assignment is
    // the subclass's responsibility — the base does NOT Object.assign.
    this.id = entity.id ?? v4();
    this.createdAt = entity.createdAt ?? new Date().toISOString();
    this.updatedAt = entity.updatedAt ?? new Date().toISOString();
  }

  public abstract toObject(): T;

  public abstract toDTO(): IEntityDto;

  public toJSON(): string {
    return JSON.stringify(this.toDTO());
  }

  /**
   * Default implementation of `fromRows` for any subclass that defines a
   * static `fromRow(row, ctx)`. Hydrates each row through the same
   * `HydrationContext` so identity dedup and back-reference resolution
   * work across the batch.
   *
   * Subclasses with extra type parameters on `fromRow` (e.g.
   * `Submission.fromRow<TM>`) override this with their own variant that
   * threads the parameter through.
   */
  static fromRows<R extends { id: EntityId }, E>(
    this: { fromRow(row: R, ctx: HydrationContext): E },
    rows: readonly R[],
    ctx: HydrationContext = new HydrationContext(),
  ): E[] {
    return rows.map((r) => this.fromRow(r, ctx));
  }
}

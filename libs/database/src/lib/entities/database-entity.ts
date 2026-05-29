import type { EntityId, IEntity, IEntityDto } from '@postybirb/types';
import { v4 } from 'uuid';
import type { SchemaKey } from '../helper-types';

/**
 * Lib-local replacement for
 * `apps/client-server/src/app/drizzle/models/database-entity.ts`.
 *
 * Key differences vs the legacy base:
 *
 * - **No implicit `Object.assign(this, entity)`.** The legacy pattern of
 *   `super(entity); Object.assign(this, entity);` in every subclass plus
 *   `Object.assign(this, entity)` in the base produced a fragile
 *   construction order: derived-class field initializers
 *   (`groups: string[] = []`) run AFTER `super()` and silently clobber
 *   whatever the base assigned. Concrete entities here MUST assign each
 *   field by name in their own constructor. The base handles only
 *   `id`, `createdAt`, and `updatedAt`.
 *
 * - **`entitySchemaKey` is non-enumerable.** Defined via
 *   `Object.defineProperty` in subclass constructors so it does NOT
 *   leak through `{ ...entity }`, `Object.keys`, JSON serialization, or
 *   drizzle insert payloads. Use `getSchemaKey(entity)` to read it
 *   externally; subclasses still expose it as a typed property.
 *
 * - **No `class-transformer` imports.** Lib entities hydrate exclusively
 *   through `static fromRow(row, ctx?)` / `static fromRows(rows, ctx?)`
 *   defined per entity.
 *
 * - **Generic over the entity interface (`T extends IEntity`).** The
 *   constructor accepts `Partial<T>` for `id` / `createdAt` /
 *   `updatedAt` only; subclasses widen for their own columns via their
 *   own constructor parameter.
 *
 * - **`toObject()` returns `T`** as an explicit object literal so the
 *   inherited signature is honest and no class-field metadata leaks.
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
}

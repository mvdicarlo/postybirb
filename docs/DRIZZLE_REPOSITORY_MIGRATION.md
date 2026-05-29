# Drizzle Repository Migration — Specification

Status: **complete**
Scope owners: `libs/database`, `apps/client-server`

## Goal

Replace the generic `PostyBirbDatabase<TSchemaKey>` wrapper with one fully-typed
repository class per schema. Eliminate the typing weaknesses caused by indexing
`db.query[K]` with a generic key, replace `class-transformer`-based row
hydration with explicit, identity-aware mappers, and relocate the data layer
(entities + repositories + supporting infrastructure) from `apps/client-server`
into `libs/database` so the database package owns the full schema → entity →
repository pipeline.

## Non-goals

- No changes to existing schema definitions, relation definitions, or
  `getDatabase()` / migration code in `libs/database`. Only additions to the
  lib (new folders for entities, repositories, infrastructure).
- No changes to `tsconfig.base.json` strictness flags.
- No real `db.transaction(...)` usage. `TransactionContext`'s manual
  track/rollback pattern is retained because of known drizzle + better-sqlite3
  incompatibilities.
- No soft deletes, no ORM swap, no DI overhaul of repository instantiation
  (repositories continue to be instantiated with `new` in service field
  initializers / `super(...)` calls).
- No validation hooks (`beforeInsert` / `beforeUpdate` / etc.).

## Out-of-scope but acknowledged

The following exist as known issues and are explicitly NOT addressed here:

- `tsconfig` is not in strict mode; the `as unknown as XDto` pattern in every
  entity's `toDTO()` is unaffected by this work.
- `saveFromEntity` optimistic-concurrency check stays functionally identical;
  only its plumbing changes (see §6).

---

## 1. File layout

The data layer (entities, repositories, infrastructure) moves into
`libs/database`. Only framework adapters (the NestJS `PostyBirbService` base
and the services/controllers that consume repositories) remain in
`apps/client-server`.

### `libs/database/src/lib/` (after migration)

```text
libs/database/src/lib/
├── database.ts                       // unchanged: getDatabase(), migrate, types
├── helper-types.ts                   // unchanged
├── schemas/                          // unchanged
├── relations/                        // unchanged
├── entities/                         // MOVED from apps/client-server/src/app/drizzle/models
│   ├── database-entity.ts            // base class, no class-transformer
│   ├── account.entity.ts
│   ├── custom-shortcut.entity.ts
│   ├── directory-watcher.entity.ts
│   ├── file-buffer.entity.ts
│   ├── notification.entity.ts
│   ├── post-event.entity.ts
│   ├── post-queue-record.entity.ts
│   ├── post-record.entity.ts
│   ├── settings.entity.ts
│   ├── submission.entity.ts
│   ├── submission-file.entity.ts
│   ├── tag-converter.entity.ts
│   ├── tag-group.entity.ts
│   ├── user-converter.entity.ts
│   ├── user-specified-website-options.entity.ts
│   ├── website-data.entity.ts
│   ├── website-options.entity.ts
│   └── index.ts
├── repositories/                     // NEW
│   ├── base/
│   │   ├── entity-repository.ts
│   │   ├── subscriber-bus.ts
│   │   ├── hydration-context.ts
│   │   ├── repository-registry.ts
│   │   ├── errors.ts                 // EntityNotFoundError, OptimisticConcurrencyError
│   │   └── types.ts                  // SubscriberCb, Action, DefaultWithFor<K>, etc.
│   ├── account.repository.ts
│   ├── custom-shortcut.repository.ts
│   ├── directory-watcher.repository.ts
│   ├── file-buffer.repository.ts
│   ├── notification.repository.ts
│   ├── post-event.repository.ts
│   ├── post-queue-record.repository.ts
│   ├── post-record.repository.ts
│   ├── settings.repository.ts
│   ├── submission.repository.ts
│   ├── submission-file.repository.ts
│   ├── tag-converter.repository.ts
│   ├── tag-group.repository.ts
│   ├── user-converter.repository.ts
│   ├── user-specified-website-options.repository.ts
│   ├── website-data.repository.ts
│   ├── website-options.repository.ts
│   └── index.ts
├── transaction/                      // NEW
│   └── transaction-context.ts        // MOVED from apps/client-server/src/app/drizzle
└── save-from-entity.ts               // MOVED from postybirb-database.util.ts
```

`libs/database/src/index.ts` re-exports everything consumers need:
entity classes, repository classes, `EntityRepository`, `SubscriberBus`,
`HydrationContext`, `RepositoryRegistry`, `TransactionContext`,
`withTransactionContext`, `EntityNotFoundError`,
`OptimisticConcurrencyError`, and the existing `Schemas` / `getDatabase` /
relation re-exports.

### `apps/client-server/src/app/` (after migration)

```text
apps/client-server/src/app/
├── common/service/
│   └── postybirb-service.ts          // updated to accept EntityRepository from lib
└── drizzle/                          // DELETED in full
```

Services that previously imported from
`apps/client-server/src/app/drizzle/models/*` and
`apps/client-server/src/app/drizzle/postybirb-database/*` now import from
`@postybirb/database` (whatever path alias is configured in
`tsconfig.base.json`). The `apps/client-server/src/app/drizzle/` directory is
removed entirely.

### Lib framework-agnosticism

`libs/database` MUST NOT import from `@nestjs/*`. The base class throws
`EntityNotFoundError` (a plain `Error` subclass defined in
`repositories/base/errors.ts`), not NestJS `NotFoundException`. The
`PostyBirbService` base in client-server is responsible for catching
`EntityNotFoundError` and re-throwing as `NotFoundException` if any consumer
relies on the NestJS exception filter behavior. Audit existing
`catch (NotFoundException)` sites; if any exist, add the remap. If none do,
the lib's error reaches the global filter unwrapped — acceptable, but
document it on `PostyBirbService`.

## 2. Base class — `EntityRepository<TKey, TEntity>`

Single abstract class. Subclasses pass concrete literal `TKey` and concrete
`TEntity`, which narrows `db.query[TKey]` at the property type and removes the
generic-indexing problem.

```ts
export abstract class EntityRepository<
  TKey extends SchemaKey,
  TEntity extends DatabaseEntity,
> {
  readonly db: PostyBirbDatabaseType; // base obtains via getDatabase() in its own constructor
  readonly schemaKey: TKey;            // passed via super(...) so it is available inside the base constructor
  readonly table: Schemas[TKey];
  protected readonly query: PostyBirbDatabaseType['query'][TKey];
  protected readonly EntityClass: EntityCtor<TEntity>;
  protected readonly defaultWith?: DefaultWithFor<TKey>;

  // Reads
  findById(id: EntityId, opts?: { failOnMissing?: boolean }, withOverride?: DefaultWithFor<TKey>): Promise<TEntity | null>;
  findAll(): Promise<TEntity[]>;
  find<TCfg extends FindManyConfig<TKey>>(config: TCfg & KnownKeysOnly<TCfg, FindManyConfig<TKey>>): Promise<TEntity[]>;
  findOne<TCfg extends Omit<FindFirstConfig<TKey>, 'limit'>>(config: TCfg): Promise<TEntity | null>;
  select(query: SQL): Promise<TEntity[]>; // raw db.select(), no relations, no default `with`
  count(filter?: SQL): Promise<number>;

  // Writes
  insert(values: Insert<TKey>): Promise<TEntity>;
  insert(values: Insert<TKey>[]): Promise<TEntity[]>;
  update(id: EntityId, set: Partial<Insert<TKey>>): Promise<TEntity>; // throws EntityNotFoundError if missing
  deleteById(ids: EntityId[]): Promise<RunResult>;

  // Pub/sub passthroughs
  subscribe(keys: SchemaKey | SchemaKey[], cb: SubscriberCb): this;
  /** Alias for SubscriberBus.notify(this.schemaKey, ids, action). Coalesced. */
  notify(ids: EntityId[], action: Action): void;
}
```

### Behavioral requirements (must match today's `PostyBirbDatabase`)

- `findById` with `failOnMissing: true` throws `EntityNotFoundError` carrying
  the id and schema key in the message (§5 standardizes the message).
- `find` / `findOne` use `config.with ?? this.defaultWith` (per-call override
  wins; default is applied when no `with` is provided).
- `findAll` always applies `defaultWith`. Consumers needing a different
  eager-load set must use `find({ with: ... })`.
- `insert` returns hydrated entities by re-fetching each inserted id through
  `findById` (preserves default eager-load on the returned entity).
- `update` precondition-checks via `findById(id, { failOnMissing: true })`
  before issuing the SQL update, then re-fetches and returns the fresh entity.
- All three write operations (`insert`, `update`, `deleteById`) fire
  `SubscriberBus.notify(this.schemaKey, ids, action)` after the SQL succeeds.
- `select(SQL)` performs `db.select().from(this.table).where(SQL)` without
  relations; results are still hydrated via `EntityClass.fromRow`.

### Type fixes locked in by the new base

| Old issue | New behavior |
| --- | --- |
| `update(id, set: Partial<Select<TKey>>)` | `Partial<Insert<TKey>>` |
| `update()` returns `T` while internals return `T \| null` | Internal `findById` call is asserted via the same `failOnMissing` path used in the precondition; signature stays `Promise<T>` and is honest. |
| `db.query[this.schemaKey as keyof ...]` cast | Gone. `this.query` is typed via `PostyBirbDatabaseType['query'][TKey]` at the property. |
| `record: any[]` in `find` / `findOne` / `findAll` | Concrete drizzle row type. |
| `DatabaseSchemaEntityMapConst: Record<SchemaKey, InstanceType<any>>` | Replaced by `RepositoryRegistry` (§6); the entity-class map is no longer needed because each repo holds its own `EntityClass`. |
| `classConverter(value: any \| any[])` overloads | Gone; replaced by direct `EntityClass.fromRow` / `fromRows` calls. |
| File-wide `@typescript-eslint/no-explicit-any` disables in the wrapper and `database-entity.ts` | Removed. |

## 3. Subclass shape

Each repository is small and concrete. Example:

```ts
// repositories/submission.repository.ts
const DEFAULT_LOAD = {
  options: { with: { account: true } },
  posts:   { with: { events: { with: { account: true } } } },
  postQueueRecord: true,
  files: true,
} as const satisfies DefaultWithFor<'SubmissionSchema'>;

export class SubmissionRepository extends EntityRepository<'SubmissionSchema', Submission> {
  constructor(defaultWith: DefaultWithFor<'SubmissionSchema'> = DEFAULT_LOAD) {
    super({
      schemaKey: 'SubmissionSchema',
      table: Schemas.SubmissionSchema,
      query: getDatabase().query.SubmissionSchema,
      EntityClass: Submission,
      defaultWith,
    });
    // Registration happens once per process via the base constructor
    // (see RepositoryRegistry in §6 — first-registration-wins).
  }
}
```

Rules:

- The base constructor receives `schemaKey` as a literal-typed argument and
  assigns it to `this.schemaKey`. This makes it available inside the base
  constructor (TS class-field initializers run after `super()` returns, so an
  `abstract readonly schemaKey` field would be `undefined` during base
  construction).
- The base constructor calls `RepositoryRegistry.register(schemaKey, this)`.
  Subclasses do not call `register` themselves.
- The base constructor obtains `db` itself via `getDatabase()`; subclasses do
  not pass it.
- Each subclass passes its concrete table, query handle, and `EntityClass` to
  `super(...)`.
- A subclass MAY define a `DEFAULT_LOAD` constant. If a service today
  instantiates `new PostyBirbDatabase('XSchema', someLoad)`, that `someLoad`
  moves into the corresponding repo as its default. If multiple consumers of
  the same schema use different loads, the repo default reflects the most
  common case and callers pass per-instance overrides via the constructor.
- Schema-specific query helpers (e.g. `findByAccount`) MAY be added to
  subclasses but are NOT introduced as part of this migration — only ports of
  existing inline call sites if they cleanly belong on the repo.

## 4. Hydration — `HydrationContext` + per-entity `fromRow`

Replaces `class-transformer` (`plainToInstance`/`plainToClass`) entirely for
the new code path. `class-transformer` remains a workspace dependency — it
is used elsewhere in the app — but `libs/database/src/lib/entities/**` and
the new repository layer MUST NOT import from it. **`reflect-metadata` is
also NOT a candidate for removal** — NestJS DI requires it at the
application entry point.

### `HydrationContext`

```ts
export class HydrationContext {
  private cache = new Map<string, DatabaseEntity>();

  getOrCreate<T extends DatabaseEntity>(
    schemaKey: SchemaKey,
    id: EntityId,
    construct: () => T,
    populate?: (instance: T) => void,
  ): T {
    const key = `${schemaKey}:${id}`;
    const hit = this.cache.get(key) as T | undefined;
    if (hit) return hit;
    const instance = construct();
    this.cache.set(key, instance); // MUST register before populate runs
    populate?.(instance);
    return instance;
  }
}
```

- One `HydrationContext` per top-level repository call. `EntityRepository`
  creates it and threads it into `EntityClass.fromRow(row, ctx)`.
- Contexts are NOT reused across repository calls. Two sequential
  `repo.findById(x)` calls produce entities that do NOT share identity
  even when they describe the same row; this is intentional (separate
  fetches return separate snapshots).
- Register-before-populate ordering is mandatory. Any nested mapper that
  encounters an already-mapped `(schemaKey, id)` returns the cached shell
  rather than re-constructing. This handles the back-references drizzle
  returns when a `with` clause descends into a relation that points back to
  its parent.
- Identity dedup is a deliberate behavior change: today the same row
  appearing twice in a result yields two distinct instances; afterwards they
  share identity. Document this on `HydrationContext`.

### Per-entity `fromRow`

Each entity in `libs/database/src/lib/entities/` gains:

```ts
class Submission extends DatabaseEntity {
  // ...fields...

  static fromRow(row: SubmissionRow, ctx: HydrationContext = new HydrationContext()): Submission {
    return ctx.getOrCreate(
      'SubmissionSchema',
      row.id,
      () => new Submission({ /* scalar columns only */ }),
      (e) => {
        if (row.options) e.options = row.options.map((o) => WebsiteOptions.fromRow(o, ctx));
        if (row.files)   e.files   = row.files.map((f) => SubmissionFile.fromRow(f, ctx));
        if (row.posts)   e.posts   = row.posts.map((p) => PostRecord.fromRow(p, ctx));
        if (row.postQueueRecord) {
          e.postQueueRecord = PostQueueRecord.fromRow(row.postQueueRecord, ctx);
        }
      },
    );
  }

  static fromRows(rows: SubmissionRow[], ctx: HydrationContext = new HydrationContext()): Submission[] {
    return rows.map((r) => Submission.fromRow(r, ctx));
  }
}
```

Rules:

- Scalar columns are assigned in `construct`; relation properties are assigned
  in `populate`.
- Lib entity files (`libs/database/src/lib/entities/*.entity.ts`) contain
  **no** `@Type(() => X)`, `@Exclude`, or other `class-transformer`
  decorators — they are omitted at copy time in Phase B step 6. Lib
  hydration goes exclusively through `fromRow`, so the decorators serve no
  purpose in the lib. The legacy client-server entity files keep their
  decorators in place until they are deleted in Phase D step 20 / Phase E
  step 25.
- A per-entity row type alias is defined in the entity file. It MUST be the
  **fully-eager superset** — every relation optional, and each relation's
  nested `*Row` type also covers all of *its* relations. This lets a single
  `fromRow` handle any subset of `with` the caller passes, with TS
  guaranteeing column coverage:
  ```ts
  type SubmissionRow = InferSelectModel<typeof SubmissionSchema> & {
    options?: WebsiteOptionsRow[];        // WebsiteOptionsRow itself includes optional .account etc.
    files?:   SubmissionFileRow[];
    posts?:   PostRecordRow[];
    postQueueRecord?: PostQueueRecordRow;
  };
  ```
  Each property is optional because drizzle omits it when the corresponding
  `with` is not requested. `fromRow` checks each before recursing.
- `fromDatabaseRecord` is deleted in Phase E along with the rest of the
  `apps/client-server/src/app/drizzle/` folder.

### Coverage requirement

Every scalar column and relation MUST be exercised by the per-entity spec
(§9). TypeScript alone cannot enforce this — `fromRow` reads fields rather
than exhaustively destructuring, so a newly-added column would compile
without being mapped. The per-entity spec is therefore the source of truth
for coverage, and the spec MUST assert every key of `*Row` round-trips. A
shared helper in `test-utils.ts` can perform this assertion structurally
(iterate `Object.keys(row)` and check each is present on the hydrated
entity), so individual specs do not have to enumerate columns manually.

## 5. Subscriber bus

Extracted from `PostyBirbDatabase` into its own module. Same semantics; types
tightened.

```ts
// repositories/base/subscriber-bus.ts
export type Action = 'insert' | 'update' | 'delete';
export type SubscriberCb<K extends SchemaKey = SchemaKey> =
  (ids: EntityId[], action: Action, schemaKey: K) => void;

export class SubscriberBus {
  private static map = new Map<SchemaKey, Set<SubscriberCb>>();
  static subscribe(keys: SchemaKey | SchemaKey[], cb: SubscriberCb): void;
  static unsubscribe(keys: SchemaKey | SchemaKey[], cb: SubscriberCb): void;
  static notify(key: SchemaKey, ids: EntityId[], action: Action): void;
  /** Bypasses coalescing. Fires synchronously. Used by tests and rare callers. */
  static notifyImmediate(key: SchemaKey, ids: EntityId[], action: Action): void;
  /** test helper */ static clear(): void;
  /** test helper — drains any pending coalesced notifications synchronously */
  static flush(): void;
}
```

- The third callback argument (`schemaKey`) is new. Today's callbacks accept
  `(ids, action)`; existing call sites continue to work because the extra
  positional argument is optional from the caller's perspective.
- `TransactionContext.commit()` switches its call from
  `PostyBirbDatabase.notifySubscribers(...)` to `SubscriberBus.notifyImmediate(...)`.
  `commit()` is itself a coalescing point (it already groups tracked inserts
  per schema), so it bypasses the bus's microtask queue. No other change to
  `TransactionContext` is required; its public surface (`track`, `trackMany`,
  `getDb`, `cleanup`, `commit`, `withTransactionContext`) is unchanged.

### Notification coalescing

`notify` does NOT invoke subscribers synchronously. Instead it appends
`(ids, action)` to a per-`(schemaKey, action)` pending bucket and schedules a
single microtask (`queueMicrotask`) drain if one is not already scheduled.

Drain semantics:

- One subscriber invocation per `(schemaKey, action)` per tick, with the
  union of all ids collected during that tick.
- Per-action ordering is preserved (`insert` buckets drain before `update`
  before `delete`); cross-action ordering within the same tick follows that
  fixed order rather than insertion order. This is the same effective
  ordering the existing pipeline relies on (inserts are visible before
  updates that reference them).
- Ids are deduplicated within a bucket. The order of ids within a notification
  is insertion order with duplicates removed.
- If a subscriber callback itself calls `notify(...)`, that call schedules a
  fresh microtask (it does not append to the currently-draining bucket). This
  prevents unbounded re-entry within a single drain.
- Subscriber callback exceptions are caught and logged; one failing
  subscriber does not prevent others from being called and does not abort
  the drain.

Rationale: today every individual write in a loop fires a separate websocket
emit. Coalescing reduces N emits to 1 per `(schemaKey, action)` per tick
without changing observable semantics for any caller that already `await`s
between writes.

Behavior change to be aware of: concurrent writes (e.g.
`Promise.all([repo.insert(x), repo.update(y)])`) will fire notifications in
the fixed `insert → update → delete` order rather than the order the SQL
statements completed. Single-statement-per-tick consumers are unaffected.
The migration must check that no current consumer relies on per-write
notification ordering inside a `Promise.all` (likely none do).

Escape hatches:

- `notifyImmediate(key, ids, action)` bypasses the queue entirely. Used by
  `TransactionContext.commit()` and available to callers that need
  synchronous delivery (none today; documented as the migration path if a
  consumer can't tolerate the microtask boundary).
- `EntityRepository.notify(ids, action)` is the per-repo shortcut for
  `SubscriberBus.notify(this.schemaKey, ids, action)` and also coalesces.
  (This replaces the old `forceNotify` name, which was misleading; the new
  name matches the bus.)

Test requirements (in `subscriber-bus.spec.ts`):

- Two `notify` calls in the same tick for the same `(key, action)` produce
  one callback invocation with the union of ids.
- `notify` calls for different actions in the same tick produce separate
  invocations in `insert` → `update` → `delete` order.
- `notifyImmediate` fires synchronously and does not interact with pending
  buckets.
- A throwing subscriber does not prevent others in the same bucket from
  running.
- `flush()` drains pending notifications synchronously so other specs do not
  need `await Promise.resolve()` ceremony.

### Standardized error messages

`EntityNotFoundError` thrown by `findById({ failOnMissing: true })` and by
`update` must use the format:

```text
{SchemaKey} with id "{id}" not found
```

This replaces today's mix of bare-id and ad-hoc messages. The error is a
plain `Error` subclass defined in `repositories/base/errors.ts` — the lib
does not throw NestJS exceptions (see §1, lib framework-agnosticism).

## 6. `RepositoryRegistry` and `saveFromEntity`

`postybirb-database.util.ts` currently does `new PostyBirbDatabase(entitySchemaKey)`
where `entitySchemaKey` is a runtime value. The per-schema design has no
equivalent constructor, so:

```ts
// libs/database/src/lib/repositories/base/repository-registry.ts
export class RepositoryRegistry {
  private static map = new Map<SchemaKey, EntityRepository<SchemaKey, DatabaseEntity>>();
  /** First registration wins. Subsequent calls log a warning and are ignored. */
  static register<K extends SchemaKey>(key: K, repo: EntityRepository<K, any>): void;
  static get<K extends SchemaKey>(key: K): EntityRepository<K, any>;
  /** test helper */ static clear(): void;
}
```

- The base `EntityRepository` constructor calls
  `RepositoryRegistry.register(this.schemaKey, this)`. Subclasses do not.
- **First-registration-wins** is required (not last-writer-wins). Multiple
  `new SubmissionRepository(...)` instances are expected (each consumer
  constructs its own with its own default load). If `saveFromEntity` could
  grab a later-registered repo it would depend on NestJS module
  instantiation order, which is not stable across test/production boots.
  First-wins gives deterministic routing.
- The optimistic-concurrency helper (today `saveFromEntity`) moves to
  `libs/database/src/lib/save-from-entity.ts`, is rewritten to use
  `RepositoryRegistry.get(entity.entitySchemaKey)`, and throws
  `OptimisticConcurrencyError` (lib-local error class) instead of the
  current ad-hoc `Error`. Its public signature is otherwise unchanged.
- `RepositoryRegistry.clear()` is called by the test helper between tests so
  per-test `:memory:` repos register cleanly.

## 7. `PostyBirbService` base

Located at `apps/client-server/src/app/common/service/postybirb-service.ts`.
This class stays in client-server because it owns the NestJS / websocket
adapter layer. Changes from being parameterized by `SchemaKey` to being
parameterized by a concrete repository imported from `libs/database`.

```ts
import { EntityRepository, EntityNotFoundError } from '@postybirb/database';

export abstract class PostyBirbService<TRepo extends EntityRepository<SchemaKey, any>> {
  constructor(
    protected readonly repository: TRepo,
    protected readonly webSocket?: WebSocket,
  ) {}

  async findById(id: EntityId): Promise<RepoEntity<TRepo> | null> {
    return this.repository.findById(id);
  }
  // If any caller relies on catching NestJS NotFoundException, remap here:
  //   try { return await this.repository.findById(id, { failOnMissing: true }); }
  //   catch (e) { if (e instanceof EntityNotFoundError) throw new NotFoundException(e.message); throw e; }
  findAll(): Promise<RepoEntity<TRepo>[]> { return this.repository.findAll(); }
  remove(id: EntityId): Promise<RunResult> { return this.repository.deleteById([id]); }

  protected throwIfExists(/* unchanged */): Promise<void>;
}
```

`RepoEntity<TRepo>` is a small `infer` helper extracting the entity type from
the repo's second type parameter. Audit existing
`catch (e instanceof NotFoundException)` sites before deciding whether the
remap shown above is needed.

## 8. Consumer migration

Every `new PostyBirbDatabase('XSchema', ...)` (~20 sites across services and
repositories) is replaced with `new XRepository(...)` imported from
`@postybirb/database`. The argument shape of the default `with` is identical;
only the constructor name and import path change.

`PostyBirbService` subclasses change their `super(...)` call from
`super(new PostyBirbDatabase('XSchema'), ws)` to `super(new XRepository(), ws)`.

Import-path migration is mechanical:

- `from '../../drizzle/models/submission.entity'` → `from '@postybirb/database'`
- `from '../../drizzle/postybirb-database/postybirb-database'` → `from '@postybirb/database'`
- `from '../../drizzle/transaction-context'` → `from '@postybirb/database'`

The `@postybirb/database` alias is whatever path is already configured in
`tsconfig.base.json` for the lib (verify and use the existing alias; do not
invent a new one).

No call-site code below the constructor changes:

- `this.repository.findById(id, { failOnMissing: true })` — same; throws
  `EntityNotFoundError` instead of `NotFoundException` (see §7 for remap
  guidance)
- `this.repository.find({ where: (c, { eq }) => ... })` — same; `c` is now
  narrowed to the schema's columns
- `this.repository.insert(...)` / `update(...)` / `deleteById(...)` — same
- `this.repository.subscribe([...], cb)` — same; callback signature gains an
  optional third parameter
- `this.repository.schemaEntity` references must be renamed to
  `this.repository.table` (the new name is more accurate; do this as part of
  the migration, not as a separate pass)
- `this.repository.db` is preserved as a public field for the few
  `withTransactionContext(this.fileRepository.db, ...)` call sites

## 9. Tests

All repository / infrastructure / entity tests live in `libs/database` and
run under `nx run database:test`. Only the `PostyBirbService` base spec and
domain service specs remain in client-server.

### Base coverage (in `libs/database`)

- `libs/database/src/lib/repositories/base/entity-repository.spec.ts`
  exercises one representative concrete subclass (use
  `SubmissionRepository`) against an in-memory db. Covers: `findById`
  failOnMissing behavior, default `with` vs override, `insert` returning
  hydrated entity, `update` precondition `EntityNotFoundError`,
  `deleteById` returning `RunResult`, subscriber fires on each write op,
  `count`, raw `select`.
- `libs/database/src/lib/repositories/base/subscriber-bus.spec.ts` —
  subscribe/unsubscribe/notify, multi-key subscription, third-arg
  `schemaKey` delivered, plus the coalescing tests listed in §5.
- `libs/database/src/lib/repositories/base/hydration-context.spec.ts` —
  identity dedup for repeated ids, back-reference (parent in child) returns
  the cached parent shell, fresh context per top-level call.
- `libs/database/src/lib/repositories/base/repository-registry.spec.ts` —
  register/get round-trip; `saveFromEntity` uses registry.

### Per-entity coverage (in `libs/database`)

`libs/database/src/lib/entities/*.entity.spec.ts` round-trips a representative
row including all relations, asserting:

- Every scalar column is preserved.
- Each relation hydrates to the correct entity class.
- A back-reference in a `with` clause yields object identity with the parent.

### Test helper

`libs/database/src/lib/repositories/base/test-utils.ts`:

```ts
export function createTestRepository<R extends EntityRepository<SchemaKey, any>>(
  Ctor: new () => R,
): R;
```

Wires `:memory:` db, runs `migrate`, calls `clearDatabase()` and
`SubscriberBus.clear()` and `RepositoryRegistry.clear()` in an
`afterEach` registered by the helper. Replaces the ad-hoc `clearDatabase()`
calls scattered through existing specs.

### Existing `postybirb-database.spec.ts`

Deleted. Its assertions are covered by the new base spec and per-repo specs.

## 10. Deletions

At the end of the migration, after all consumers have moved:

- `apps/client-server/src/app/drizzle/` (whole folder — entities, repos,
  wrapper, transaction-context, util all moved or removed).
- The `DatabaseSchemaEntityMap` and `DatabaseSchemaEntityMapConst` types
  (replaced by `RepositoryRegistry` for runtime lookup and by the per-repo
  `EntityClass` field for type-level lookup).
- All `@Type(...)`, `@Exclude` imports from `class-transformer` in entity
  files.
- `fromDatabaseRecord` helper.
- The original `postybirb-database.ts`, `postybirb-database.util.ts`,
  `find-options.type.ts`, `schema-entity-map.ts`, and
  `postybirb-database.spec.ts`.

Verify the `class-transformer` and `reflect-metadata` packages stay in
`package.json` regardless — `class-transformer` is used by other parts of
the app outside the data layer, and `reflect-metadata` is required by
NestJS DI. The migration removes their imports from the data layer only,
not from the workspace.

## 11. Execution order

The migration is structured so that **the entire new data layer in
`libs/database` is built, unit-tested, and integration-tested against an
in-memory database before any file inside `apps/client-server` is changed.**
Phases A–C touched only `libs/database`. Phases D–E touched `apps/client-server`.

### Phase A — lib base infrastructure (lib-only). PR-sized.

1. In `libs/database`, add `repositories/base/` modules (`HydrationContext`,
   `SubscriberBus`, `RepositoryRegistry`, `errors.ts`, `types.ts`,
   `EntityRepository`).
2. Add unit specs for `HydrationContext`, `SubscriberBus`, and
   `RepositoryRegistry` (testable without any concrete subclass — pure
   in-memory data structures).
3. Add `libs/database/src/lib/transaction/transaction-context.ts` as a copy
   of the current client-server file, re-pointed to the lib's
   `SubscriberBus`. The client-server copy is left in place; nothing imports
   the lib version yet.
4. Update `libs/database/src/index.ts` to re-export the new infrastructure.
5. `nx run database:test` and `nx run database:lint` pass.

### Phase B — lib entities (lib-only). PR-sized.

6. Copy each `apps/client-server/src/app/drizzle/models/*.entity.ts` into
   `libs/database/src/lib/entities/`. The lib copy is the **clean** form:
   - `static fromRow` / `fromRows` + per-entity `*Row` type alias added.
   - `@Type(() => X)`, `@Exclude`, and any other `class-transformer`
     decorators are **omitted from the lib copy from day one** — the lib
     never hydrates via `class-transformer`, so the decorators serve no
     purpose there. Removing them at copy time avoids needing to add
     `class-transformer` as a lib dep and avoids a later strip pass.
   - `toDTO()` and other entity methods are preserved.
7. The client-server entity files at
   `apps/client-server/src/app/drizzle/models/*.entity.ts` are **not
   touched** in this phase. They continue to carry their decorators and
   continue to be the entities the legacy `PostyBirbDatabase` wrapper
   hydrates. The two sets of entity classes coexist as independent copies
   until Phase D.
8. Add `libs/database/src/lib/entities/*.entity.spec.ts` covering `fromRow`
   round-trips for every scalar column (per §4 Coverage requirement, using
   the shared `test-utils.ts` helper).
9. Re-export entity classes from `libs/database/src/index.ts`.
10. `nx run database:test` and `nx run database:lint` pass. `apps/client-server`
    is unchanged; its tests still pass because nothing about its code path
    moved.

### Phase C — lib repositories + `saveFromEntity` (lib-only). PR-sized.

11. Add all 18 `libs/database/src/lib/repositories/*.repository.ts` files.
    The base constructor registers each instance via
    `RepositoryRegistry.register`. Re-export from `libs/database/src/index.ts`.
12. Add `libs/database/src/lib/save-from-entity.ts` (the lib version of
    `saveFromEntity` that resolves repositories via `RepositoryRegistry`).
    Re-export.
13. Add the `EntityRepository` integration spec (deferred from Phase A) —
    spin up a `better-sqlite3 :memory:` database, apply migrations, exercise
    `findById` / `findAll` / `find` / `insert` / `update` / `delete` /
    `findById(failOnMissing)` / `withDefaultWith` / subscriber callbacks
    against `SubmissionRepository` (chosen because it covers the widest
    relation surface).
14. Add per-repository specs for the remaining 17 repositories. Each spec:
    inserts a representative row, reads it back, verifies relations hydrate
    as declared by `defaultWith`, verifies `update` emits the expected
    subscriber event with the right `EntityAction`, verifies `delete`
    cascades / restricts per schema definition.
15. Add a `RepositoryRegistry`-level integration spec that constructs every
    repository, asserts `RepositoryRegistry.resolveByEntity(entity)` returns
    the correct repo for an instance of each entity class, and exercises
    `saveFromEntity` against a representative cross-entity case.
16. `nx run database:test` passes with **full coverage of the new lib data
    layer**. At this point the new data layer is independently proven and
    no client-server file has been modified.

### Phase D — client-server cutover. Single PR for steps 17 + 18, then per-schema PRs for 19 onward.

17. Migrate `PostyBirbService` base in `apps/client-server` to accept
    *either* a legacy `PostyBirbDatabase` instance *or* an `EntityRepository`
    via a temporary union type. This lets subclasses migrate one at a time
    without breaking the base. The union is removed in Phase E.
18. Audit `catch (NotFoundException)` sites and add the
    `EntityNotFoundError` → `NotFoundException` remap in `PostyBirbService`
    so consumers can swap their data source without losing the NestJS
    exception filter behaviour.
19. Migrate consumers (services / repositories) one schema at a time,
    replacing `new PostyBirbDatabase('XSchema', ...)` with
    `new XRepository(...)` (imported from `@postybirb/database`) and
    updating field types. `schemaEntity` → `table` rename happens here.
    Each migrated consumer's existing spec suite must continue to pass.
20. As each schema's last consumer is migrated, delete the corresponding
    `apps/client-server/src/app/drizzle/models/X.entity.ts` (no more
    consumers reference it; all references now resolve to the lib entity).
21. Migrate the `super(new PostyBirbDatabase('XSchema'), ws)` /
    `super('XSchema', ws)` shorthand callers in `PostyBirbService` subclasses
    to `super(new XRepository(), ws)`.
22. Move `saveFromEntity` call sites to
    `import { saveFromEntity } from '@postybirb/database'`.
23. Switch `withTransactionContext` callers to import from the lib.

### Phase E — cleanup. PR-sized.

24. Remove the temporary `PostyBirbDatabase | EntityRepository` union from
    `PostyBirbService`; the base now accepts `EntityRepository` only.
25. Delete `apps/client-server/src/app/drizzle/` in full (any entity files
    not already deleted in step 20, plus `postybirb-database.ts`,
    `postybirb-database.util.ts`, `postybirb-database.spec.ts`,
    `find-options.type.ts`, `schema-entity-map.ts`, `transaction-context.ts`,
    `fromDatabaseRecord`).
26. Run `nx run-many --target=test --all` and
    `nx run-many --target=build --all`.
27. `class-transformer` and `reflect-metadata` remain in the root
    `package.json` — both are used by other parts of the app
    (`class-transformer` outside the data layer, `reflect-metadata` by
    NestJS DI). The migration removes their *data-layer* imports only;
    `libs/database/package.json` never needed to declare them because lib
    entities never carried the decorators.

## 12. Acceptance criteria

- `apps/client-server/src/app/drizzle/` does not exist.
- `libs/database/src/lib/entities/`, `libs/database/src/lib/repositories/`,
  `libs/database/src/lib/transaction/` exist with the layout described in §1.
- `libs/database/src/index.ts` re-exports every public symbol consumers need
  (entity classes, repository classes, `EntityRepository`, `SubscriberBus`,
  `HydrationContext`, `RepositoryRegistry`, `TransactionContext`,
  `withTransactionContext`, `saveFromEntity`, `EntityNotFoundError`,
  `OptimisticConcurrencyError`, plus existing `Schemas` / `getDatabase` /
  relation re-exports).
- `libs/database` has no imports from `@nestjs/*` or from `apps/`.
- No file in `libs/database` or `apps/client-server/src/app/` contains
  `@typescript-eslint/no-explicit-any` file-wide disables introduced by the
  data layer, `as keyof PostyBirbDatabaseType`, `as unknown as TEntityClass`,
  or `any[]` row annotations from the old wrapper.
- No file in `libs/database/src/lib/entities/` imports from
  `class-transformer` (the lib hydration path uses only `fromRow`).
- `nx run database:test`, `nx run database:lint`, `nx run database:build`
  pass.
- `nx run client-server:test`, `nx run client-server:lint`,
  `nx run client-server:build` pass.
- `nx run-many --target=test --all` passes.
- `grep -r "new PostyBirbDatabase(" apps/ libs/` returns no matches.
- `grep -r "from '.*drizzle/models" apps/` returns no matches.
- `grep -rE "\.schemaEntity\b" apps/ libs/` returns no matches outside
  `libs/database/src/lib/repositories/base/`.
- `reflect-metadata` remains in `package.json` (required by NestJS).
- `class-transformer` remains in `package.json` (used elsewhere in the
  app); only the data-layer imports are removed.
- A row containing the same nested entity id twice hydrates to two property
  references with `===` identity (asserted by spec).

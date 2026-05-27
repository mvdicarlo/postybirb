# Drizzle Repository Migration — Implementation Plan

Status: not started
Companion to: [DRIZZLE_REPOSITORY_MIGRATION.md](DRIZZLE_REPOSITORY_MIGRATION.md)

This document is the trackable, checkable form of the migration spec. Each
step lists its **expected outputs** (concrete files/changes) and the
**tests** that must pass before the step is considered done. Phases are
sequential; steps within a phase are sequential unless noted. Tick the boxes
as work lands.

Phases A–C touch **only** `libs/database`. Phases D–E touch
`apps/client-server`. The new data layer is fully proven against an
in-memory database before any client-server file is modified.

Conventions:

- "Compiles" means `nx run database:lint` and `nx run database:build` (or
  the lib's equivalent target) pass with zero errors and no new warnings.
- "Tests pass" means `nx run database:test` (lib phases) or
  `nx run client-server:test` (consumer phases) is green.
- Per-step gate: every step must compile + pass tests before the next step
  starts.
- File paths are relative to the workspace root.

---

## Phase A — lib base infrastructure (lib-only)

PR scope: single PR.

Goal: the foundational repository plumbing (registry, bus, hydration
context, base class, transaction context) exists in `libs/database` with
unit tests, exported but not yet consumed.

### Step 1 — Add repository base modules ✅

- [x] Outputs:
  - [x] `libs/database/src/lib/repositories/base/types.ts` — `SchemaKey`
    re-export, `Action`, `SubscriberCb<K>`, `EntityId`, `DefaultWithFor<K>`,
    `FindManyConfig<K>`, `FindFirstConfig<K>`, `EntityCtor<T>`,
    `RepoEntity<R>`, helper aliases.
  - [x] `libs/database/src/lib/repositories/base/errors.ts` (re-export
    barrel) + `entity-not-found.error.ts` + `optimistic-concurrency.error.ts`
    — `EntityNotFoundError` and `OptimisticConcurrencyError` (plain `Error`
    subclasses; no `@nestjs/*` imports). Split into one-class-per-file to
    satisfy the workspace `max-classes-per-file` ESLint rule.
  - [x] `libs/database/src/lib/repositories/base/hydration-context.ts` —
    `HydrationContext` class per §4.
  - [x] `libs/database/src/lib/repositories/base/subscriber-bus.ts` —
    `SubscriberBus` static class per §5 (subscribe/unsubscribe/notify with
    microtask coalescing, `notifyImmediate`, `clear`, `flush`).
  - [x] `libs/database/src/lib/repositories/base/repository-registry.ts` —
    `RepositoryRegistry` per §6 (first-registration-wins, `clear`).
  - [x] `libs/database/src/lib/repositories/base/entity-repository.ts` —
    abstract `EntityRepository<TKey, TEntity>` per §2. Base constructor
    obtains `db` via `getDatabase()`, assigns `schemaKey`/`table`/`query`/
    `EntityClass`/`defaultWith`, and calls
    `RepositoryRegistry.register(schemaKey, this)`.
- [x] Tests added (specs, no concrete subclass yet):
  - [x] `subscriber-bus.spec.ts`:
    - [x] subscribe → notify → callback fires with `(ids, action, schemaKey)`
    - [x] two `notify` calls in same tick same `(key, action)` → one
      callback with id union
    - [x] different actions same tick → separate invocations in
      `insert → update → delete` order
    - [x] `notifyImmediate` fires synchronously, does not consume pending
      buckets
    - [x] throwing subscriber does not abort other subscribers in the bucket
    - [x] `flush()` drains synchronously
    - [x] re-entrant `notify` from inside a subscriber schedules a fresh
      microtask, does not append to draining bucket
    - [x] unsubscribe removes the callback
    - [x] `clear()` removes all subscribers
  - [x] `hydration-context.spec.ts`:
    - [x] repeated `(schemaKey, id)` returns identical instance
    - [x] register-before-populate: a `populate` callback that recursively
      looks up the same `(schemaKey, id)` returns the in-construction shell
      (back-reference test)
    - [x] different `id` produces distinct instances
    - [x] different `schemaKey` with same `id` produces distinct instances
    - [x] separate `HydrationContext` instances do NOT share identity
  - [x] `repository-registry.spec.ts`:
    - [x] `register` + `get` round-trip
    - [x] first-registration-wins: second `register` for same key returns
      first instance from `get`, logs warning (assert warning via spy)
    - [x] `get` for unregistered key throws a clear error
    - [x] `clear()` empties the registry
  - [x] `errors.spec.ts`:
    - [x] `EntityNotFoundError` message format
      `'{SchemaKey} with id "{id}" not found'`
    - [x] `OptimisticConcurrencyError` constructable with id + schemaKey
- [x] Gate: `nx run database:lint` + `nx run database:test` green (31 tests
  across 4 spec files).

Note: `EntityRepository` itself is type-checked here but not exercised
against an in-memory db until Phase C step 13 (no concrete subclass exists
yet).

### Step 2 — Add lib `TransactionContext` ✅

- [x] Outputs:
  - [x] `libs/database/src/lib/transaction/transaction-context.ts` — copy of
    the current client-server `transaction-context.ts`, re-pointed so
    `commit()` calls `SubscriberBus.notifyImmediate(...)` (per §5) instead
    of the legacy `PostyBirbDatabase.notifySubscribers`. Public surface
    unchanged: `track`, `trackMany`, `getDb`, `cleanup`, `commit`,
    `withTransactionContext`.
- [x] Tests added:
  - [x] `transaction-context.spec.ts`:
    - [x] `track` + `commit` issues one `notifyImmediate` per
      `(schemaKey, action)` with union of tracked ids
    - [x] `cleanup` (rollback path) does NOT fire notifications
    - [x] `withTransactionContext` resolves to the callback's return value
      and propagates thrown errors after running cleanup
- [x] Gate: lib tests green (41 tests across 5 spec files). The
  client-server copy is left untouched.

### Step 3 — Export new infrastructure from lib barrel

- [ ] Outputs:
  - [ ] `libs/database/src/index.ts` re-exports: `EntityRepository`,
    `HydrationContext`, `SubscriberBus`, `RepositoryRegistry`,
    `EntityNotFoundError`, `OptimisticConcurrencyError`,
    `TransactionContext`, `withTransactionContext`, plus the types from
    `repositories/base/types.ts` consumers will need (`Action`,
    `SubscriberCb`, `EntityId`, `DefaultWithFor`).
- [ ] Tests: build/lint only (`nx run database:build`, `nx run database:lint`).
- [ ] Gate: lib build + lint green. No client-server change yet.

### Step 4 — Phase A gate

- [ ] `nx run database:test` green
- [ ] `nx run database:lint` green
- [ ] `nx run database:build` green
- [ ] `nx run client-server:test` still green (nothing in client-server
  changed, sanity check)

---

## Phase B — lib entities (lib-only)

PR scope: single PR.

Goal: clean entity classes (no `class-transformer` decorators) live in
`libs/database/src/lib/entities/` with `static fromRow`/`fromRows` and
per-entity `*Row` aliases. Client-server entity files are NOT touched.

### Step 5 — Copy `database-entity.ts` (base entity)

- [ ] Outputs:
  - [ ] `libs/database/src/lib/entities/database-entity.ts` — base class,
    `entitySchemaKey` field, no `class-transformer` imports.
- [ ] Tests: lint + build only.
- [ ] Gate: lib lint + build green.

### Step 6 — Copy + clean each entity (18 entities)

For each entity below: copy the current `apps/client-server/src/app/drizzle/
models/X.entity.ts` to `libs/database/src/lib/entities/X.entity.ts`. In the
copy:

- Strip all `@Type(() => X)`, `@Exclude`, and any other `class-transformer`
  decorators and imports.
- Add `static fromRow(row, ctx?)` and `static fromRows(rows, ctx?)` per §4.
- Add a per-entity row type alias (`type XRow = InferSelectModel<typeof
  XSchema> & { ...optional relations... }`).
- Preserve `toDTO()` and any existing entity methods unchanged.

Per-entity output checkboxes (each implies the file is created and its spec
in step 7 passes):

- [ ] `account.entity.ts`
- [ ] `custom-shortcut.entity.ts`
- [ ] `directory-watcher.entity.ts`
- [ ] `file-buffer.entity.ts`
- [ ] `notification.entity.ts`
- [ ] `post-event.entity.ts`
- [ ] `post-queue-record.entity.ts`
- [ ] `post-record.entity.ts`
- [ ] `settings.entity.ts`
- [ ] `submission.entity.ts`
- [ ] `submission-file.entity.ts`
- [ ] `tag-converter.entity.ts`
- [ ] `tag-group.entity.ts`
- [ ] `user-converter.entity.ts`
- [ ] `user-specified-website-options.entity.ts`
- [ ] `website-data.entity.ts`
- [ ] `website-options.entity.ts`

- [ ] `libs/database/src/lib/entities/index.ts` re-exports all of the
  above.

### Step 7 — Add per-entity `fromRow` specs

- [ ] Outputs:
  - [ ] `libs/database/src/lib/repositories/base/test-utils.ts` adds a
    shared `assertRowRoundtrips(row, entity)` helper that iterates
    `Object.keys(row)` and asserts each is present on the hydrated entity
    (per §4 Coverage requirement).
  - [ ] One spec file per entity:
    - [ ] `account.entity.spec.ts`
    - [ ] `custom-shortcut.entity.spec.ts`
    - [ ] `directory-watcher.entity.spec.ts`
    - [ ] `file-buffer.entity.spec.ts`
    - [ ] `notification.entity.spec.ts`
    - [ ] `post-event.entity.spec.ts`
    - [ ] `post-queue-record.entity.spec.ts`
    - [ ] `post-record.entity.spec.ts`
    - [ ] `settings.entity.spec.ts`
    - [ ] `submission.entity.spec.ts`
    - [ ] `submission-file.entity.spec.ts`
    - [ ] `tag-converter.entity.spec.ts`
    - [ ] `tag-group.entity.spec.ts`
    - [ ] `user-converter.entity.spec.ts`
    - [ ] `user-specified-website-options.entity.spec.ts`
    - [ ] `website-data.entity.spec.ts`
    - [ ] `website-options.entity.spec.ts`
  - [ ] Each spec asserts (no db required — `fromRow` operates on plain
    rows):
    - [ ] every scalar column round-trips via `assertRowRoundtrips`
    - [ ] each declared relation hydrates to the correct entity class when
      present in the input row
    - [ ] each declared relation is left `undefined`/unset when absent from
      the input row
    - [ ] a back-reference in nested rows (e.g.
      `submission.options[0].submission = <same id>`) shares object
      identity with the parent when a shared `HydrationContext` is passed

### Step 8 — Export entities from lib barrel

- [ ] Outputs:
  - [ ] `libs/database/src/index.ts` re-exports every entity class and its
    `*Row` type.
- [ ] Gate: lib build + lint green.

### Step 9 — Phase B gate

- [ ] `nx run database:test` green (Phase A specs + 18 new entity specs)
- [ ] `nx run database:lint` green
- [ ] `nx run database:build` green
- [ ] `nx run client-server:test` still green — sanity check that
  client-server's entity files / wrapper / specs are completely undisturbed

---

## Phase C — lib repositories + `saveFromEntity` (lib-only)

PR scope: single PR (or split per repo group if it grows too large).

Goal: the full repository layer exists in `libs/database` with full
integration coverage against `:memory:`. End-state of this phase: a
self-contained, independently testable data layer.

### Step 10 — Build `test-utils.ts` helper

- [ ] Outputs:
  - [ ] `libs/database/src/lib/repositories/base/test-utils.ts` (extends
    helper started in step 7) adds:
    - [ ] `createTestRepository<R>(Ctor: new () => R): R` — wires
      `:memory:` db, runs migrations, registers `afterEach` to
      `clearDatabase()`, `SubscriberBus.clear()`,
      `RepositoryRegistry.clear()`.
    - [ ] `createTestRepositories(ctors)` for multi-repo specs.
- [ ] Tests:
  - [ ] `test-utils.spec.ts`:
    - [ ] `createTestRepository` returns a working repo against `:memory:`
    - [ ] `afterEach` cleanup runs (registry/bus empty on next test)
- [ ] Gate: lib tests green.

### Step 11 — Add 18 repository subclasses

For each schema, create the corresponding repository file. Each subclass:

- extends `EntityRepository<'XSchema', XEntity>`
- defines `DEFAULT_LOAD` matching the most common consumer's current
  `defaultWith` argument from the legacy `new PostyBirbDatabase('XSchema',
  ...)` call sites
- passes `{ schemaKey, table, query, EntityClass, defaultWith }` to
  `super(...)`

Output checkboxes:

- [ ] `account.repository.ts`
- [ ] `custom-shortcut.repository.ts`
- [ ] `directory-watcher.repository.ts`
- [ ] `file-buffer.repository.ts`
- [ ] `notification.repository.ts`
- [ ] `post-event.repository.ts`
- [ ] `post-queue-record.repository.ts`
- [ ] `post-record.repository.ts`
- [ ] `settings.repository.ts`
- [ ] `submission.repository.ts`
- [ ] `submission-file.repository.ts`
- [ ] `tag-converter.repository.ts`
- [ ] `tag-group.repository.ts`
- [ ] `user-converter.repository.ts`
- [ ] `user-specified-website-options.repository.ts`
- [ ] `website-data.repository.ts`
- [ ] `website-options.repository.ts`
- [ ] `libs/database/src/lib/repositories/index.ts` re-exports all of the
  above.
- [ ] `libs/database/src/index.ts` re-exports the repositories barrel.

### Step 12 — Add `saveFromEntity`

- [ ] Outputs:
  - [ ] `libs/database/src/lib/save-from-entity.ts` — port of the existing
    `postybirb-database.util.ts` `saveFromEntity` logic, using
    `RepositoryRegistry.get(entity.entitySchemaKey)` to resolve the repo
    and throwing `OptimisticConcurrencyError` on conflict. Public signature
    unchanged.
  - [ ] `libs/database/src/index.ts` re-exports `saveFromEntity`.
- [ ] Tests:
  - [ ] `save-from-entity.spec.ts`:
    - [ ] happy path: entity saved, version bumped, returned entity is
      fresh hydrate
    - [ ] concurrent modification → `OptimisticConcurrencyError` thrown
    - [ ] missing entity → `EntityNotFoundError` thrown
    - [ ] uses repository resolved via `RepositoryRegistry`

### Step 13 — `EntityRepository` integration spec

- [ ] Outputs:
  - [ ] `libs/database/src/lib/repositories/base/entity-repository.spec.ts`
    using `SubmissionRepository` as the representative subclass.
- [ ] Assertions:
  - [ ] `findById(missing, { failOnMissing: true })` throws
    `EntityNotFoundError` with the spec'd message format
  - [ ] `findById(missing)` returns `null`
  - [ ] `findAll()` applies `defaultWith`
  - [ ] `find({ with: ... })` override wins over `defaultWith`
  - [ ] `find({})` with no `with` applies `defaultWith`
  - [ ] `insert(value)` returns hydrated entity with `defaultWith` applied
  - [ ] `insert(values[])` returns hydrated array, count matches
  - [ ] `update(id, set)` precondition throws `EntityNotFoundError` when id
    missing; returns hydrated entity on success
  - [ ] `update(id, set)` accepts `Partial<Insert<TKey>>` (compile-time
    check; spec uses a type-only assertion)
  - [ ] `deleteById([ids])` returns `RunResult` with expected `changes`
  - [ ] subscriber fires once per write op with the affected ids and
    correct action
  - [ ] subscriber receives `schemaKey` as third arg
  - [ ] `count()` and `count(SQL)` return expected counts
  - [ ] `select(SQL)` returns hydrated entities without relations
  - [ ] `notify(ids, action)` from repo equals direct
    `SubscriberBus.notify(this.schemaKey, ids, action)` (coalesced)
- [ ] Gate: spec green.

### Step 14 — Per-repository integration specs (17 remaining)

For each repository other than `SubmissionRepository`, add a spec that:

- inserts a representative row (with relations where applicable)
- reads it back and asserts relations hydrate per the repo's `DEFAULT_LOAD`
- updates one field and asserts the subscriber fires with the right action
- deletes and asserts cascade/restrict behavior matches the schema
- exercises any per-schema unique surface (composite uniqueness, FK
  cascades, etc.) the legacy `postybirb-database.spec.ts` covered for that
  schema

Output checkboxes:

- [ ] `account.repository.spec.ts`
- [ ] `custom-shortcut.repository.spec.ts`
- [ ] `directory-watcher.repository.spec.ts`
- [ ] `file-buffer.repository.spec.ts`
- [ ] `notification.repository.spec.ts`
- [ ] `post-event.repository.spec.ts`
- [ ] `post-queue-record.repository.spec.ts`
- [ ] `post-record.repository.spec.ts`
- [ ] `settings.repository.spec.ts`
- [ ] `submission-file.repository.spec.ts`
- [ ] `tag-converter.repository.spec.ts`
- [ ] `tag-group.repository.spec.ts`
- [ ] `user-converter.repository.spec.ts`
- [ ] `user-specified-website-options.repository.spec.ts`
- [ ] `website-data.repository.spec.ts`
- [ ] `website-options.repository.spec.ts`

(Note: `submission.repository.spec.ts` is the one written for step 13.)

### Step 15 — Cross-entity registry / `saveFromEntity` integration spec

- [ ] Outputs:
  - [ ] `libs/database/src/lib/repositories/repository-registry.integration.spec.ts`:
    - [ ] constructs every repository, asserts `RepositoryRegistry.get(K)`
      returns each
    - [ ] `RepositoryRegistry.get(K)` for each `SchemaKey` returns an
      `instanceof` the corresponding repository class
    - [ ] hydrated entity of each class round-trips through
      `saveFromEntity` end-to-end against `:memory:`

### Step 16 — Phase C gate

- [ ] `nx run database:test` green (Phase A + B + C specs)
- [ ] `nx run database:lint` green
- [ ] `nx run database:build` green
- [ ] `nx run client-server:test` still green (still untouched)
- [ ] **Manual checklist:**
  - [ ] every `SchemaKey` has a corresponding `XRepository` class exported
    from `@postybirb/database`
  - [ ] every entity has a `*Row` type and `static fromRow`/`fromRows`
  - [ ] every entity / repo / base module appears in `libs/database/src/index.ts`
  - [ ] no file in `libs/database/src/lib/{entities,repositories,transaction}`
    imports from `class-transformer`, `@nestjs/*`, or `apps/`

---

## Phase D — client-server cutover

PR scope: single PR for steps 17 + 18 (base service prep). Steps 19 + 20
form one PR per schema (17 schema-scoped PRs total). Steps 21–23 are
mechanical cleanup PRs.

Goal: every consumer in `apps/client-server` now uses the lib repositories;
the legacy wrapper still exists but is no longer reachable.

### Step 17 — Widen `PostyBirbService` base

- [ ] Outputs:
  - [ ] `apps/client-server/src/app/common/service/postybirb-service.ts`
    accepts `PostyBirbDatabase<any, any> | EntityRepository<SchemaKey, any>`
    via a temporary union alias `PostyBirbDataSource`. Methods
    (`findById`, `findAll`, `remove`, `throwIfExists`) delegate to either
    via a thin adapter. The union is removed in Phase E step 24.
- [ ] Tests:
  - [ ] existing `postybirb-service.spec.ts` still passes against the
    legacy wrapper
  - [ ] new test case constructs the base against a lib `EntityRepository`
    and asserts the same surface works

### Step 18 — `EntityNotFoundError` remap audit + adapter

- [ ] Outputs:
  - [ ] Audit: grep for `catch (NotFoundException)` / `instanceof
    NotFoundException` across `apps/client-server/src/app/**`. Document
    findings as a comment block at the top of `postybirb-service.ts`.
  - [ ] If any sites depend on it, add the remap in `PostyBirbService`:
    `catch (e) { if (e instanceof EntityNotFoundError) throw new
    NotFoundException(e.message); throw e; }` around the `failOnMissing`
    code paths.
- [ ] Tests:
  - [ ] If remap added: new test case in `postybirb-service.spec.ts`
    asserts `EntityNotFoundError` from the lib becomes
    `NotFoundException` at the service boundary.

### Step 19 + 20 — Per-schema consumer cutover (×17, one PR each)

For each schema, in a single PR:

19. Replace every `new PostyBirbDatabase('XSchema', ...)` /
    `super(new PostyBirbDatabase('XSchema'), ws)` /
    `super('XSchema', ws)` with `new XRepository(...)` /
    `super(new XRepository(), ws)`. Update import paths to
    `@postybirb/database`. Rename `repository.schemaEntity` →
    `repository.table` at call sites.
20. Once that schema has zero remaining legacy imports, delete
    `apps/client-server/src/app/drizzle/models/X.entity.ts`. Re-run the
    consumer's full spec suite to confirm nothing imports the deleted
    file.

Per-schema PR checkboxes:

- [ ] `account` — repository cutover + entity file deleted, all
  `client-server` consumer specs green
- [ ] `custom-shortcut`
- [ ] `directory-watcher`
- [ ] `file-buffer`
- [ ] `notification`
- [ ] `post-event`
- [ ] `post-queue-record`
- [ ] `post-record`
- [ ] `settings`
- [ ] `submission`
- [ ] `submission-file`
- [ ] `tag-converter`
- [ ] `tag-group`
- [ ] `user-converter`
- [ ] `user-specified-website-options`
- [ ] `website-data`
- [ ] `website-options`

Per-PR gate for each: `nx affected -t test --base=main` green;
`nx affected -t lint --base=main` green.

### Step 21 — Migrate `saveFromEntity` call sites

- [ ] Outputs:
  - [ ] Every `from '.../postybirb-database.util'` (or wherever
    `saveFromEntity` lived) becomes
    `from '@postybirb/database'`.
  - [ ] Verify no caller depends on the legacy ad-hoc `Error`; if so,
    update to catch `OptimisticConcurrencyError`.
- [ ] Tests:
  - [ ] All `apps/client-server` specs that previously covered conflict
    behavior still pass.

### Step 22 — Migrate `withTransactionContext` call sites

- [ ] Outputs:
  - [ ] Every
    `from '.../drizzle/transaction-context'` becomes
    `from '@postybirb/database'`.
  - [ ] `withTransactionContext(db, ...)` calls are unchanged in shape;
    only the import path moves.
- [ ] Tests:
  - [ ] All client-server specs touching transaction-context behavior pass.

### Step 23 — Phase D gate

- [ ] No file under `apps/client-server/src/app/**` imports from
  `apps/client-server/src/app/drizzle/postybirb-database/**` or
  `apps/client-server/src/app/drizzle/models/**` (the latter directory may
  already be empty).
- [ ] `nx run-many --target=test --all` green
- [ ] `nx run-many --target=lint --all` green
- [ ] `nx run-many --target=build --all` green

---

## Phase E — cleanup

PR scope: single PR.

Goal: legacy wrapper deleted; temporary union removed; workspace clean.

### Step 24 — Remove temporary `PostyBirbDataSource` union

- [ ] Outputs:
  - [ ] `apps/client-server/src/app/common/service/postybirb-service.ts`
    accepts `EntityRepository<SchemaKey, any>` only.
- [ ] Tests:
  - [ ] `postybirb-service.spec.ts` updated to drop the legacy-wrapper case
    if still present; all client-server specs green.

### Step 25 — Delete `apps/client-server/src/app/drizzle/`

- [ ] Outputs (each file/folder confirmed removed):
  - [ ] `apps/client-server/src/app/drizzle/postybirb-database/postybirb-database.ts`
  - [ ] `apps/client-server/src/app/drizzle/postybirb-database/postybirb-database.spec.ts`
  - [ ] `apps/client-server/src/app/drizzle/postybirb-database/postybirb-database.util.ts`
  - [ ] `apps/client-server/src/app/drizzle/postybirb-database/find-options.type.ts`
  - [ ] `apps/client-server/src/app/drizzle/postybirb-database/schema-entity-map.ts`
  - [ ] `apps/client-server/src/app/drizzle/transaction-context.ts`
  - [ ] `apps/client-server/src/app/drizzle/models/*` (any entity files
    not already deleted in Phase D step 20)
  - [ ] `apps/client-server/src/app/drizzle/` directory itself
- [ ] Verify: no references remain via
  `grep -r "drizzle/postybirb-database\|drizzle/models\|drizzle/transaction-context"
  apps/`.

### Step 26 — Workspace gate

- [ ] `nx run-many --target=test --all` green
- [ ] `nx run-many --target=lint --all` green
- [ ] `nx run-many --target=build --all` green
- [ ] `nx graph` shows `apps/client-server` depends on `@postybirb/database`
  (or the configured alias) and no legacy `drizzle/` folder is referenced

### Step 27 — Dependency audit

- [ ] `class-transformer` remains in the root `package.json` (used outside
  the data layer — do NOT remove). Verified by grep.
- [ ] `reflect-metadata` remains in the root `package.json` (required by
  NestJS DI). Verified by grep.
- [ ] `libs/database/package.json` does NOT depend on `class-transformer`
  or `@nestjs/*` (it never needed to — lib entities have no decorators).
- [ ] Note logged in PR description: removal of data-layer imports only,
  not workspace-wide removal.

---

## Acceptance criteria (mirror of §12 in the spec)

- [ ] `apps/client-server/src/app/drizzle/` does not exist.
- [ ] `libs/database/src/lib/{entities,repositories,transaction}` exist per
  the spec's §1 layout.
- [ ] `libs/database/src/index.ts` re-exports every public symbol consumers
  need.
- [ ] `libs/database` has no imports from `@nestjs/*` or from `apps/`.
- [ ] No file in `libs/database` or `apps/client-server/src/app/` contains
  the old `as keyof PostyBirbDatabaseType` / `record: any[]` /
  `classConverter` patterns.
- [ ] All 18 repositories exist and are registered in `RepositoryRegistry`.
- [ ] All 18 entity classes have `static fromRow` / `fromRows` and a
  `*Row` type alias, with no `class-transformer` decorators.
- [ ] `SubscriberBus` coalescing tests pass.
- [ ] `nx run-many --target=test --all` green.
- [ ] `nx run-many --target=build --all` green.

---

## Progress dashboard

Tick when each phase is fully merged.

- [ ] **Phase A** — lib base infrastructure
- [ ] **Phase B** — lib entities
- [ ] **Phase C** — lib repositories + `saveFromEntity` (lib data layer
  independently proven)
- [ ] **Phase D** — client-server cutover (17 schemas)
- [ ] **Phase E** — cleanup

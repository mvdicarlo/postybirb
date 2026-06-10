# Relay → PostyBirb: real implementation plan

How to land the Relay prototype (`prototypes/relay/`) in the actual NestJS +
Drizzle + Electron app. Grouped by layer, with concrete file targets and the
existing conventions each must follow.

---

## 0. Codebase facts this plan relies on

- **DB**: Drizzle ORM + `better-sqlite3`. Schemas in
  `libs/database/src/lib/schemas/*.schema.ts`, re-exported from `schemas/index.ts`.
  `SchemaKey` is auto-derived from any export ending in `Schema`.
- **Entities**: `DatabaseEntity` subclasses in `…/entities/` with
  `fromRow(row, ctx)`, `toObject()`, `toDTO()`; hydrate relations via
  `HydrationContext`.
- **Repositories**: extend `EntityRepository<'XSchema', XEntity>`; the base ctor
  auto-registers in `RepositoryRegistry` (first-wins). Write ops broadcast via
  `SubscriberBus`.
- **Migrations**: `yarn generate:sql` (`drizzle-kit generate`) → emits to
  `apps/postybirb/src/migrations`. Tests run an in-memory DB and `migrate()`
  against that folder, so new tables "just work" in specs once generated.
- **WebSocket**: `WSGateway.emit({event, data})`; event name constants in
  `libs/socket-events`. UI consumes via `AppSocket.on(EVENT)` + Zustand stores.
- **Sharp**: `SharpInstanceManager.resizeForPost({buffer, resize, mimeType,…})`
  already runs in an isolated worker pool — this is the prototype's `Encoder`.
- **Website contract**: decorators inject `decoratedProps`:
  `fileOptions` (`acceptedMimeTypes`, `acceptedFileSizes`, `fileBatchSize`,
  `acceptsExternalSourceUrls`, `maxAltTextLength`) and
  `metadata.minimumPostWaitInterval`; file sites implement
  `calculateImageResize`, `onPostFileSubmission`, message sites
  `onPostMessageSubmission`. These map 1:1 to the prototype's `Website` type.
- Current posting lives in `apps/client-server/src/app/post` (post-manager-v2,
  post-queue, post-file-resizer, post-record-factory) — the replacement target.

---

## 1. Database schema (3 new tables replace record+event+queue)

New files in `libs/database/src/lib/schemas/`, added to `schemas/index.ts`.

### `post-job.schema.ts`
```
post-job:
  ...CommonSchema()                       // id, createdAt, updatedAt
  version            text
  submissionId       id → submission (cascade)
  attemptOf          id → post-job (set null)   // resume/retry lineage
  status             text enum NodeStatus
  resumeMode         text enum ResumeMode
  priority           real default 0
  scheduledFor       text (ISO)  nullable
  completedAt        text nullable
  relations: submission(one), tasks(many post-task), attemptOf(one self)
  index: (submissionId, status)
```

### `post-task.schema.ts`
```
post-task:
  ...CommonSchema()
  jobId              id → post-job (cascade)
  accountId          id → account (set null)     // survive account delete
  websiteId          text                          // website *name*, stable id
  status             text enum NodeStatus
  dependency         text {json} <Dependency>      // {mode, tasks[], n?}
  attempts           integer default 0
  maxAttempts        integer default 3
  idempotencyKey     text
  sourceUrl          text nullable
  message            text nullable
  error              text {json} <TaskError> nullable
  waitingUntil       text (ISO) nullable           // persisted! survives restart
  accountSnapshot    text {json} {name,website}     // survive account delete
  relations: job(one), account(one), units(many post-unit)
  index: (jobId, status), (jobId, accountId)
```

### `post-unit.schema.ts`
```
post-unit:
  ...CommonSchema()
  taskId             id → post-task (cascade)
  kind               text enum UnitKind            // BATCH | MESSAGE
  ordinal            integer
  status             text enum NodeStatus
  fileIds            text {json} string[]
  sourceUrl          text nullable
  error              text {json} <TaskError> nullable
  relations: task(one)
  index: (taskId)
```

### Rate-limit persistence
Either a 4th tiny table or reuse settings. Recommended table:
```
post-rate-window:
  key                text primary key   // rateKey(): a:<acct> | w:<site> | w:<site>|a:<acct>
  lastPostedAt        text (ISO)
```
Backs a `SqliteRateStore implements RateStore`. One shared limiter (singleton
provider) so concurrent jobs share windows.

### Migration & back-compat
- Run `yarn generate:sql`; commit the generated SQL + `meta` snapshot.
- The old `post-record`/`post-event`/`post-queue` tables stay until the history
  UI is ported. Plan: keep reading old records for "Post History" until a
  one-time projector backfills `post-job` rows, then drop them in a later
  migration. No destructive change in the first PR.

---

## 2. Entities, repositories, DTOs

Per new table, mirror existing patterns:
- **Entity**: `PostJob`/`PostTask`/`PostUnit` extend `DatabaseEntity`, implement
  `IPostJob`/`IPostTask`/`IPostUnit`, with `fromRow` hydrating children via
  `ctx.hydrateMany`. (The prototype classes in `engine/model.ts` become these
  interfaces' shapes — drop the hand-rolled constructors in favor of entities.)
- **Repository**: `PostJobRepository extends EntityRepository<'PostJobSchema',
  PostJob>` etc. Add specialized queries:
  - `PostJobRepository.findActive()` (status not terminal) — crash recovery + UI.
  - `findBySubmission(submissionId)` — history.
  - `PostTaskRepository.findByJob(jobId, {units:true})`.
- **DTOs** in `libs/types/src/dtos/post/` + register in repository `toDTO()`.

Export all from `libs/database/src/index.ts` barrel like the others.

---

## 3. Types library additions

`libs/types/src/enums/`:
- `node-status.enum.ts` (`QUEUED|READY|RUNNING|WAITING|SUCCEEDED|FAILED|SKIPPED|CANCELLED`)
- `unit-kind.enum.ts` (`BATCH|MESSAGE`)
- `post-error-kind.enum.ts` (`RATE_LIMITED|AUTH_EXPIRED|VALIDATION_FAILED|TRANSFORM_FAILED|TRANSIENT|FATAL`)
- keep/repurpose `post-record-resume-mode.enum.ts` (`NEW|CONTINUE|RETRY`).

`libs/types/src/models/post/`:
- `IPostJob`, `IPostTask`, `IPostUnit`, `Dependency` union, `TaskError`,
  `TransformPlan`, and the UI projection `JobTreeNode`.

`libs/socket-events`: add `POST_STATE_DELTA` (and keep `POST_WAIT_STATE` or fold
it into deltas — see §7).

---

## 4. Website contract extensions

Small, additive decorator changes in
`apps/client-server/src/app/websites/decorators/`:
- `website-metadata.decorator.ts`: add optional
  `rateLimitScope?: 'account'|'website'|'website+account'` (default account).
- `supports-files.decorator.ts` (`WebsiteFileOptions`): add optional
  `sourceDependencyMode?: 'all'|'any'|{count:number}` (default `all`).

Everything else the prototype's `Website` needs already exists on
`decoratedProps`. Write a thin adapter `toRelayWebsite(instance)` (or have the
pipeline read `instance.decoratedProps` directly) so no website implementation
changes — the ~30 existing sites keep working untouched.

---

## 5. Engine port (the core)

New dir `apps/client-server/src/app/post/engine/` carrying over the prototype
modules, NestJS-ified:

| Prototype | Becomes | Notes |
|---|---|---|
| `model.ts` | `engine/model.ts` | keep state machine + `evaluateDependency`; entity *shapes* move to types/entities |
| `errors.ts` | `engine/errors.ts` | unchanged (typed errors + retry policy) |
| `trace.ts` | `engine/tracer.service.ts` | inject `WSGateway`; write NDJSON to `PostyBirbDirectories.LOGS_DIRECTORY`; project to DB ledger |
| `transform.ts` | `engine/transform/*` | `Encoder` → wraps `SharpInstanceManager`; planner reuses `getSupportedFileSize` + `calculateImageResize` |
| `rate-limit.ts` | `engine/rate-limiter.service.ts` | `SqliteRateStore`; shared singleton |
| `pipeline.ts` | `engine/pipeline/*` | stages as injectable units; deps via DI |
| `scheduler.ts` | `engine/post-scheduler.service.ts` | `@Injectable`, `OnModuleInit`, `@Cron`, mutex |

Wire into `post.module.ts` providers (replacing `PostManagerRegistry`,
`FileSubmissionPostManager`, `MessageSubmissionPostManager`,
`PostQueueService`, `PostFileResizerService`, `PostRecordFactory`).

---

## 6. Persistence integration (prototype gaps → production)

The prototype holds the job tree in memory; production must persist each
transition. Polish items:

1. **Persist on transition.** Every status change writes through the
   repository. Wrap a task pass's mutations in `withTransactionContext(repo.db,…)`
   so a crash mid-pass leaves a consistent tree. Status writes already
   broadcast via `SubscriberBus`.
2. **Load tree from DB** in `scheduler.runJob` instead of an in-memory map;
   `resetForResume` becomes a repo update.
3. **Crash recovery** (`OnModuleInit`): `findActive()` → any RUNNING/WAITING job
   re-enters the scheduler (replaces today's `resumeInterruptedPosts`). Because
   `waitingUntil` is persisted, rate-limit countdowns resume correctly.
4. **Scheduling**: `@Cron(EVERY_30_SECONDS)` sweep enqueues submissions whose
   `schedule.scheduledFor <= now` (port existing logic) + recurring handling.
5. **Pause/resume**: read `settings.queuePaused` (already exists); scheduler
   skips dequeuing while paused.
6. **Terminal handling**: archive non-recurring on success, clear `isScheduled`,
   emit notifications via `NotificationsService` (port from `PostQueueService`).

---

## 7. UI interface

- **New event** `POST_STATE_DELTA`: tracer emits `projectTask`/`projectJob`
  `JobTreeNode` on every transition (debounced/coalesced per tick).
- **REST snapshot**: `GET /post/jobs/active` → `projectJob` for all active jobs
  (reload / late-join). Add to `PostController`.
- **UI store**: replace the three sources (wait-state store, `latestPost.events`
  assembly, queue) with one `usePostingState` Zustand store keyed by jobId that
  merges the snapshot + deltas. `posting-activity-panel.tsx` and
  `post-history` render `JobTreeNode` directly. `waitingUntil` lives on WAITING
  nodes, so `POST_WAIT_STATE` can be retired (or kept as a thin alias for one
  release).

---

## 8. Transform specifics (accuracy)

- `Encoder.encode` becomes **async** and returns the real encoded buffer +
  byte length from `resizeForPost`. `runTransform` is awaited; verify loop
  unchanged. Keep the **content-addressed cache** (`hash(sourceHash+plan)`) —
  cache the output buffer on disk under a temp dir keyed by hash; evict on job
  completion.
- Planner reuses existing helpers: `instance.calculateImageResize(file)`,
  `getSupportedFileSize(instance, file)`, dynamic limits, per-account dimension
  overrides, `maxAltTextLength`, and `FileConverterService.canConvert/convert`
  for unsupported mimes + text alt-file fallback (port from
  `file-submission-post-manager.resizeOrModifyFile`).
- Verify is the *only* new behavior over today's resizer — a guard, not a
  rewrite.

---

## 9. Prototype polish needed before/while porting

- **Async throughout**: pipeline stages, encoder, tracer disk writes.
- **AbortSignal**: already used; wire `scheduler.cancel(jobId)` to the
  dequeue/cancel controller (replaces `cancelIfRunning`).
- **Idempotency**: persist `idempotencyKey`; on resume, if a unit's status is
  ambiguous (RUNNING at crash), prefer a website dedupe check before re-POST.
- **Secret redaction**: trace currently logs `postData`; reuse the existing
  `redactPostDataForLogging` before writing parsed options to the NDJSON.
- **Trace rotation**: per-job NDJSON under the logs dir; tie cleanup to the
  existing `winston-daily-rotate-file` retention policy / job completion.
- **Concurrency caps**: scheduler `maxConcurrentJobs/Tasks` from settings;
  guard shared rate windows with the existing `async-mutex`.
- **Recurring submissions**: a SUCCEEDED recurring job spawns the next
  scheduled job rather than archiving.

---

## 10. Testing strategy (match existing patterns)

- **Repository specs** (`*.repository.spec.ts`) for the 3 tables using the
  in-memory DB + migrations, mirroring `post-record.repository.spec.ts`.
- **Engine unit tests**: port `verify.ts`'s 46 assertions into Jest specs
  (resize verify, cache, dep modes any/all/count + blocked, rate scopes,
  resume). These are pure and fast.
- **Pipeline/scheduler integration**: a fake `Website` registry (the prototype's
  mocks) + in-memory DB to assert persistence + crash-recovery.
- **Sharp encoder test**: small real image through `resizeForPost` asserting the
  verify post-conditions hold on actual bytes.

---

## 11. Suggested PR sequence (incremental, each shippable)

1. **Types + schema + migrations + repos** (no behavior change; tables unused).
2. **Engine port behind a feature flag**, with ported Jest specs; old
   post-manager still default.
3. **Sharp encoder + transform planner** wired; dry-run preview endpoint.
4. **Scheduler + persistence + crash recovery**; flip flag in dev.
5. **WebSocket deltas + UI job-tree store**; retire `POST_WAIT_STATE` alias.
6. **History projector + cutover**; remove post-manager-v2 + old tables.

---

## 12. Risk / watch-list

- **Drizzle JSON columns** for `dependency`/`error`/`fileIds`: typed via
  `$type<…>()` like existing `metadata` columns — fine, but validate on read.
- **First-registration-wins repos**: construct engine repos once (DI singleton)
  to avoid the multi-instance warning.
- **Transaction scope**: a task pass spans network I/O; don't hold a SQLite
  transaction across `await onPost…`. Persist before/after the network call,
  not around it.
- **Account/file deletion mid-post**: snapshots on task/unit (already in
  schema) keep history intact; `onDelete: set null` on FKs prevents cascade
  loss of the job.

# PostyBirb — "Relay" Posting Framework (Design)

A clean-room redesign of posting/tracking. Throws out the imperative
`PostManager` + event-replay-resume model. Everything is local-first
(SQLite + NDJSON files + sharp worker pool), no cloud required.

---

## 1. Core requirements extracted from the codebase

What posting fundamentally must do (observed from current code):

- **Submission** (FILE or MESSAGE) with per-account `WebsiteOptions`, a
  schedule, and ordered files.
- For each account, run a **website implementation** that exposes
  `onPostFileSubmission` / `onPostMessageSubmission`, `calculateImageResize`,
  validation, and constraints (accepted mime types, static + dynamic file-size
  limits, `fileBatchSize`, `acceptsExternalSourceUrls`,
  `minimumPostWaitInterval`, `maxAltTextLength`).
- **File pipeline**: filter `ignoredWebsites`, sort by `order`, batch by
  `fileBatchSize`, convert unsupported mimes (incl. alt-file fallback),
  resize to dimension + byte limits, generate thumbnails.
- **Source-URL tracking + propagation**: a post on site A produces a URL that
  must be injected into later posts (sites that accept external sources go
  last).
- **Queue + scheduling**: manual enqueue + cron sweep for scheduled/recurring
  submissions; pause/resume; crash recovery of interrupted posts.
- **Rate limiting** per account via `minimumPostWaitInterval`.
- **Resume** (CONTINUE / RETRY / NEW) without redoing successful work.
- **Observability**: JSON logs (winston + loglayer), an immutable event ledger,
  and live UI via WebSocket (`POST_WAIT_STATE`, `SUBMISSION_UPDATES`).
- Terminal handling: archive non-recurring on success, notify, mark FAILED.

### Pain points the redesign fixes
1. Resume state is **reconstructed by replaying the event ledger** across a
   chain of `PostRecord`s (`originPostRecordId`) with fragile aggregation.
2. **One post per submission-type at a time** (`isPosting()` guard on a
   singleton manager) — no true concurrency.
3. **Procedural mega-method** mixes auth, validate, parse, resize, rate-limit,
   post, event-emit, notify, telemetry — hard to test/instrument in isolation.
4. **Rate-limit + wait state is in-memory only**, lost on restart.
5. UI assembles state from three sources (wait-state store, `latestPost.events`,
   queue) instead of one model.

---

## 2. The big idea

> **Model a post as a persisted *job tree* of independent work units, executed
> by a staged pipeline, emitting one correlated trace.**

Three pillars:

1. **Job Tree** — explicit, persisted state. *The tree IS the state.* Resume =
   re-run any non-succeeded node. No event replay.
2. **Stage Pipeline** — each work unit runs a fixed, ordered list of small,
   individually testable middleware stages. Every stage transition is traced.
3. **Unified Trace** — one append-only NDJSON stream per job (`jobId` /
   `taskId` / `stage` correlated). It feeds both the UI projection (compact
   subset in SQLite) and deep debugging (full firehose on disk).

---

## 3. Data model — the Job Tree

```
PostJob                         one posting attempt for a submission
├─ submissionId, attemptOf?     (attemptOf links a retry to its origin job)
├─ status, schedule, priority
└─ WebsiteTask[]                one per (account + website option)  = "post here"
   ├─ accountId, websiteId, dependsOn[]      (deps drive source-URL ordering)
   ├─ status, attempts/maxAttempts, idempotencyKey
   ├─ result { sourceUrl, message }   |   error { kind, stage, message, stack }
   └─ Unit[]                    the atomic dispatch units
      • FILE submission → one BatchUnit per file batch (status per batch)
      • MESSAGE submission → one MessageUnit
```

Every node shares a lifecycle state machine:

```
QUEUED → READY → RUNNING → ┬─ SUCCEEDED
                           ├─ WAITING (rate-limit / dependency)  → READY
                           ├─ FAILED   (terminal-failure)
                           ├─ SKIPPED  (e.g. file in ignoredWebsites)
                           └─ CANCELLED
```

Why this is better:

- **Resume is trivial & exact.** Reload the tree, re-run every node not in
  `{SUCCEEDED, SKIPPED}`. CONTINUE = default. RETRY = also reset succeeded
  `BatchUnit`s. NEW = fresh tree. No aggregation, no ledger replay.
- **Source URLs live on the node** (`WebsiteTask.result.sourceUrl`) and
  `dependsOn` edges generalize today's coarse "standard-then-external" pass into
  a real dependency graph (a task can depend on specific upstream tasks).
- **Progress falls out for free** — UI just counts node statuses.
- **File batching is first-class** — each batch is its own resumable unit.

### Persistence (SQLite via drizzle)
Three slim tables replace the `post-record` / `post-event` complexity:

- `post_job` (id, submissionId, attemptOf, status, priority, scheduledFor,
  createdAt, completedAt, version)
- `post_task` (id, jobId, accountId, websiteId, status, dependsOn json,
  idempotencyKey, sourceUrl, message, error json, attempts)
- `post_unit` (id, taskId, kind, ordinal, status, sourceUrl, error json,
  fileIds json, batchIndex)

The audit ledger becomes a **projection of the trace** (see §6), not the source
of truth — so the model stays small and queries stay simple.

---

## 4. The Stage Pipeline (how one WebsiteTask runs)

Each task is run by composing ordered, pure-ish stages. Each is
`(ctx: TaskContext) => Promise<TaskContext>`, individually unit-testable, and
emits a structured trace entry on enter/exit/error.

```
 1. Resolve      load account instance, website impl, options
 2. Validate     run website validators; typed ValidationFailed on error
 3. Authenticate ensure logged in; typed AuthExpired on failure
 4. Parse        build PostData (descriptions, tags, title) per website
 5. Plan         compute TransformPlan per file (see §5) — files only
 6. Transform    execute resize/convert/thumbnail via sharp pool (cached)
 7. Gate         rate-limit token bucket + dependency wait → WAITING/READY
 8. Dispatch     onPost{File,Message}Submission(...) with AbortSignal
 9. Capture      record sourceUrl, propagate to dependents
10. Settle       write node status, emit completion delta
```

- Stages short-circuit on a **typed error** tagged with the stage name, so
  "what happened" is always answerable: each task has an ordered list of stage
  outcomes in its trace.
- **`AbortController`/`AbortSignal`** replaces the custom `CancellableToken`
  (integrates natively with `undici`/fetch; cancel = `controller.abort()`).
- Stages are declared per submission type; FILE inserts Plan/Transform, MESSAGE
  skips them. New behaviors = new stages, no edits to a mega-method.

### Typed errors drive retry policy
`RateLimited` (backoff + WAITING), `AuthExpired` (no retry, surface re-login),
`ValidationFailed` (no retry), `Transient` (exp. backoff, network/5xx/429),
`Fatal` (no retry). Per-kind retry policy is pluggable; `attempts/maxAttempts`
live on the node.

---

## 5. Accurate file resizing — declarative TransformPlan

Resizing must be **provably accurate**, so it's split into *plan* then *execute
+ verify*.

```ts
type TransformPlan = {
  targetMimeType?: string;   // convert (e.g. unsupported webp → png/jpeg)
  maxWidth?: number;         // min(website cap, user override)
  maxHeight?: number;
  maxBytes?: number;         // min(static limit, dynamic limit, user)
  allowQualityLoss: boolean;
  altTextMaxLength?: number;
  steps: ('convert' | 'scale' | 'compress' | 'thumbnail')[];
};
```

- The plan **merges** `website.calculateImageResize`, static + dynamic file-size
  limits, accepted-mime → conversion need, per-account user dimension overrides,
  and alt-text caps. The plan is logged before execution (so a too-small output
  is debuggable from the trace alone).
- Execution stays on the existing **isolated sharp worker pool** (good design —
  keep it; a libvips crash kills only a worker).
- **Content-addressed cache**: key = `hash(sourceHash + plan)`. Identical
  transforms across retries/batches/accounts are computed once, stored on disk,
  reused. Big win for multi-account cross-posting of the same files.
- **Post-condition verifier**: after execution, assert `bytes ≤ maxBytes`,
  `w ≤ maxWidth`, `h ≤ maxHeight`, `mime == target`. If not satisfied, iterate
  (binary-search quality, then downscale) until it passes or fail with a precise
  error. This is stronger than the current "resize and hope" path.

---

## 6. Observability — the unified Trace

One append-only **NDJSON trace per job**: `traces/<jobId>.ndjson`. Every stage
transition, HTTP attempt, resize, rate-limit wait, retry, and outcome is one
JSON line, correlated by ids:

```json
{"ts":"2026-06-10T21:44:01.123Z","level":"info","jobId":"j_8…","taskId":"t_3…",
 "website":"furaffinity","account":"main","stage":"transform",
 "event":"file.resized","fileId":"f_1…",
 "data":{"from":{"w":4000,"h":4000,"bytes":12117332},
         "to":{"w":1280,"h":1280,"bytes":903121},
         "plan":"fit-maxbytes","ms":341}}
```

- Built on the existing **winston + loglayer** JSON logger; adds a per-job file
  transport so a user can **export/share one file** to debug a single post.
- The DB **event ledger becomes a filtered projection** of the trace (only the
  ~10 event kinds the UI cares about) — same schema, same ids, far less storage
  and no second source of truth.
- Because stages record their inputs, a trace is effectively a **replay script**
  for an offline debug harness (see §9).

---

## 7. Scheduler & queue (concurrency, scheduling, rate limits)

A single **PostScheduler** owns everything that today is split across
`PostQueueService` + per-type `PostManager` singletons:

- **Queue**: persisted `PostJob`s in QUEUED, user-orderable by `priority`.
- **Scheduling**: durable timers for one-shot + recurring (cron via `croner`),
  with a periodic **catch-up sweep** to fire timers missed during downtime
  (keeps today's 30s-cron robustness as a safety net).
- **Concurrency**: configurable `maxConcurrentJobs` / `maxConcurrentTasks`. True
  parallelism — multiple file submissions can post at once (fixes the
  singleton `isPosting()` limitation).
- **Per-account rate limiting**: a **persisted token/leaky bucket**
  (`lastPostedAt` survives restart) replacing the in-memory
  `lastTimePostedToWebsite`. A gated task enters WAITING with a concrete
  `waitingUntil` timestamp.
- **Dependency gating**: a task waits for its `dependsOn` tasks to SUCCEED
  before READY (drives source-URL propagation precisely).
- **Crash recovery / watchdog**: on boot, RUNNING→READY re-enqueue; a stuck-task
  watchdog (today's 30-min idle check) and worker-pool self-heal.

---

## 8. UI interface — one reactive projection

Replace the three UI data sources with a single **PostingState projection**
derived from the job tree:

- **WebSocket deltas** (`POST_STATE_DELTA`): every change is the same
  `JobTreeNode` shape — task status changed, file resized, rate-limit
  started/ended (`waitingUntil`), job completed.
- **REST snapshot** (`GET /post/jobs/active`): full current tree for reload /
  late-join.
- UI = `render(tree)`. Progress %, per-account rows, per-batch file progress,
  and countdowns all derive from node `status` + `waitingUntil`. No bespoke
  wait-state store needed (it becomes a field on WAITING nodes).

Contract sketch:

```ts
type JobTreeNode = {
  id: string; kind: 'job'|'task'|'unit';
  label: string;                       // submission title / account / "batch 2/5"
  status: NodeStatus;
  progress?: { done: number; total: number };
  waitingUntil?: string;               // rate-limit / dependency countdown
  sourceUrl?: string;
  error?: { kind: string; stage: string; message: string };
  children?: JobTreeNode[];
};
```

---

## 9. Nice-to-have / robustness features

- **Dry-run / Preview**: run stages 1–6 (validate, parse, transform) *without*
  Dispatch. Surfaces per-website parsed description/tags, resize results, and
  validation issues. Excellent UX and a built-in test harness.
- **Idempotency keys** per task + optional content-hash duplicate detection to
  avoid double-posting after an ambiguous network result.
- **Replayable traces**: deterministic pipeline + recorded inputs → re-run a
  failed job offline against fixtures.
- **Source-URL provenance graph**: store "post B was seeded by post A"; UI shows
  "all places this was posted" and the propagation chain.
- **Per-website fixture tests**: record HTTP fixtures, simulate posting in CI.
- **Live ETA**: estimate completion from queue depth + rate-limit windows.
- **Pluggable retry/backoff policies** per error kind; jittered exponential
  backoff for `Transient`/`RateLimited`.
- **Pause at task granularity** + drain mode (finish in-flight, stop new).

---

## 10. Mapping to the required tenets

| Requirement | How it's met |
|---|---|
| JSON debug log | Unified NDJSON trace per job (§6), winston/loglayer based, exportable |
| Accurate resize | Declarative TransformPlan + verifier loop + sharp worker pool + cache (§5) |
| UI state interface | Single job-tree projection via WS deltas + REST snapshot (§8) |
| Queue + scheduling | PostScheduler: durable timers, cron, catch-up sweep, concurrency (§7) |
| Source URL tracking | Stored per task; `dependsOn` graph drives propagation (§3,§4) |
| File batching | First-class resumable `BatchUnit` nodes (§3) |
| Electron, no cloud | SQLite + on-disk NDJSON + in-process scheduler + sharp; telemetry optional |

---

## 11. Suggested module layout

```
post/
  engine/
    scheduler.service.ts        queue, timers, concurrency, rate buckets
    job-runner.service.ts       walks the tree, runs ready tasks
    pipeline/
      pipeline.ts               stage composition
      stages/{resolve,validate,authenticate,parse,plan,transform,gate,
              dispatch,capture,settle}.stage.ts
    model/
      job-tree.ts               node types + state machine
      errors.ts                 typed error kinds + retry policy
  transform/
    transform-planner.ts        builds TransformPlan
    transform-runner.ts         executes + verifies (sharp pool)
    transform-cache.ts          content-addressed disk cache
  trace/
    tracer.ts                   NDJSON writer + WS delta emitter
    projection.ts               trace → DB ledger + UI snapshot
  persistence/                  drizzle repos: post_job / post_task / post_unit
```

Website implementations keep their existing contract
(`onPostFileSubmission`, `calculateImageResize`, etc.) — only the orchestration
around them changes, so adapting websites is minimal.

---

## 13. Refinements made during prototyping

The prototype (`prototypes/relay/`) extends the original design above based on
real-codebase review. These supersede the simpler 7:descriptions 3in 

- **Dependencies are `all | any | count`, not a flat `dependsOn[]`.**
  `WebsiteTask.dependency = { mode, tasks, n? }`. `'any'` lets a site post as
  soon as the *first* upstream source URL exists; `'count'` waits for N; `'all'`
  (default) waits for every upstream. `evaluateDependency()` returns
  `none | satisfied | pending | blocked`, and unreachable gates resolve to
  `blocked` so dependents are SKIPPED instead of hanging. Websites declare their
  preference via `sourceDependencyMode`.

- **Rate limiting is scope-aware.** The bucket key is computed by
  `rateKey(scope, websiteId, accountId)` where scope is
  `'account' | 'website' | 'website+account'` (default `account`), declared per
  website via `rateLimitScope`. A single shared, persistable `RateStore` (SQLite
  in production) means windows survive restart and throttle across concurrent
   fixing the legacy in-memory-only limitation.jobs 

- **Resize has an explicit `Encoder` seam.** `transform.ts` isolates the
  pixel/encode work behind an `Encoder` interface so PostyBirb's existing
  `SharpInstanceManager.resizeForPost` worker pool plugs in unchanged. Relay
  only adds the declarative PLAN (policy) and the VERIFY guard (post-conditions);
  no resize math is reimplemented.

See `docs/02-implementation-plan.md` for how each lands in the real app.

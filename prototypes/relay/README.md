# Relay — posting framework prototype

A standalone, dependency-free prototype of the proposed "Relay" posting
framework for PostyBirb. It models a post as a **persisted job tree** executed
by a **staged pipeline** that emits a single **correlated NDJSON trace**.

Full documentation is in [`docs/`](./docs/):
- [`docs/01-design.md`](./docs/01-design.md) — design rationale & architecture
- [`docs/02-implementation-plan.md`](./docs/02-implementation-plan.md) — plan to land it in the real app

## Run it

No install required. Uses Node's native TypeScript stripping (Node ≥ 22.6):

```bash
# End-to-end demo (file batching, resize, propagation, rate limits, retry, resume)
node --experimental-strip-types prototypes/relay/demo.ts

# Fast deterministic assertions (25 checks, < 1s)
node --experimental-strip-types prototypes/relay/verify.ts
```

The demo writes one NDJSON trace per job to `prototypes/relay/traces/` (gitignored).

## What it demonstrates

| Tenet | Where |
|---|---|
| JSON debug log | `engine/trace.ts` — one NDJSON line per stage/event, correlated by job/task/unit |
| Accurate resize | `engine/transform.ts` — plan → execute → **verify** loop + content-addressed cache |
| UI state interface | `engine/trace.ts` `projectJob()` + live `onDelta()` deltas (one `JobTreeNode` shape) |
| Queue + scheduling | `engine/scheduler.ts` — priority queue, concurrency, dependency gating, WAITING, resume |
| Source-URL tracking | stored per task; `Dependency{all|any|count}` graph drives propagation (`engine/model.ts`, `engine/pipeline.ts`) |
| File batching | first-class resumable `Unit` (batch) nodes (`engine/model.ts`) |
| Electron, no cloud | pure in-process; SQLite/disk/sharp are swappable behind small interfaces |

## Implementation notes (production wiring)

- **Rate limiting is keyed by scope, not hardcoded to account.** A website
  declares `rateLimitScope: 'account' | 'website' | 'website+account'`;
  `rateKey()` computes the bucket. Use one shared `RateLimiter` with a
  SQLite-backed `RateStore` so windows survive restart and throttle across
  concurrent jobs.
- **Resize reuses the existing sharp code.** `transform.ts` isolates the
  pixel/encode work behind the `Encoder` seam. In production, implement
  `Encoder.encode()` by delegating to `SharpInstanceManager.resizeForPost` in
  the worker pool — Relay only adds the PLAN (policy) and VERIFY (guard) around
  it; no resize math is reimplemented.
- **Dependencies support `all` / `any` / `count`.** A site can post as soon as
  the first upstream source URL exists (`'any'`), wait for N (`{count:n}`), or
  wait for all (default). `evaluateDependency()` also detects unreachable gates
  and resolves them to `blocked` so dependents are SKIPPED instead of hanging.

## Layout

```
engine/
  model.ts        job tree (PostJob → WebsiteTask → Unit) + state machine
  errors.ts       typed errors (RATE_LIMITED/TRANSIENT/…) + retry policy
  trace.ts        NDJSON tracer + UI projection + DB-ledger projection
  transform.ts    TransformPlan planner + verifier + cache (sharp stand-in)
  rate-limit.ts   persisted per-account leaky bucket
  websites.ts     website contract + mock sites (incl. flaky + recoverable)
  pipeline.ts     staged pipeline (Resolve→…→Settle) + job planner + resume
  scheduler.ts    queue, concurrency, gating, retry orchestration, recovery
demo.ts           runnable showcase (3 scenarios)
verify.ts         deterministic assertion harness
```

This is a prototype: the website contract mirrors the real one so production
website implementations need minimal adaptation, but persistence (SQLite),
the sharp worker pool, and WebSocket wiring are represented by small swappable
interfaces rather than the real adapters.

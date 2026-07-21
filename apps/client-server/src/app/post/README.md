# Queue → Post Completion Flow

High-level flow of a submission from the persisted post queue through the Relay
engine to a completed post. See the linked sources for detail:

- `services/post-queue/post-queue.service.ts` — the persisted queue + cron cycle
- `engine/post-manager.service.ts` — orchestration entrypoint (`enqueue`, `drain`)
- `engine/scheduler.ts` — job registry + job-level concurrency
- `engine/job-reactor.ts` — per-job task reactor (event-driven, no polling)
- `engine/task-pass.ts` — the staged per-task pass
- `engine/persistence.ts` — durable job-tree state

```mermaid
flowchart TD
    subgraph QUEUE["PostQueueService - persisted queue"]
        CRON["@Cron every second -> run()"] --> EXEC["execute() - mutex, skip if paused"]
        EXEC --> LOAD["Load queue records, oldest-first"]
        LOAD --> LOOP{"For each record"}
        LOOP -->|archived| CANCELDQ["cancel + dequeue"]
        LOOP -->|outcome is terminal| DEQUEUE["dequeue, delete record"]
        LOOP -->|already posting| LEAVE["leave as-is"]
        LOOP -->|not posting| DEPGATE{"dependencies satisfied? queued-this-cycle or hasSucceeded"}
        DEPGATE -->|no| HOLD["skip, re-check next cycle"]
        DEPGATE -->|yes| ENQ["RelayPostManager.enqueue"]
    end

    ENQ --> DEDUP
    subgraph MGR["RelayPostManager.enqueue"]
        DEDUP{"active job or orphan for submission?"}
        DEDUP -->|match| REUSE["adopt or resume existing"]
        DEDUP -->|none| CREATE["createJob, prepare context, plan tasks+units, persist create"]
        CREATE --> DRAIN["drain(), runMutex + rerun flag"]
        REUSE --> DRAIN
    end

    DRAIN --> RTI
    subgraph SCHED["RelayScheduler"]
        RTI["runToIdle()"] --> PICK["pick non-terminal jobs, up to maxConcurrentJobs"]
        PICK --> RUNJOB["runJob, reactor.run(job, token)"]
    end

    RUNJOB --> PUMP
    subgraph REACTOR["JobReactor - per job, fastq up to maxConcurrentTasks"]
        PUMP["pump, schedule runnable tasks, skip dependency-BLOCKED"]
        PUMP --> WORKER["worker, runTaskWithRetries(task)"]
        WORKER --> S1
    end

    subgraph PASS["runTaskPass - staged"]
        S1["Resolve, Authenticate, Parse, Validate"]
        S1 --> UNITS["per unit, ordinal 0,1,2..."]
        UNITS --> GATE{"Gate, rate-limit wait needed?"}
        GATE -->|rate-limited| PARK["return rate_limited, task WAITING"]
        GATE -->|clear| DISPATCH["Transform, Dispatch to website, Capture markPosted + sourceUrl"]
        DISPATCH --> NEXTUNIT{"more units?"}
        NEXTUNIT -->|yes| UNITS
        NEXTUNIT -->|no| SETTLE["Settle, task SUCCEEDED"]
    end

    PARK --> TIMER["afterTask, scheduleParkTimer interruptible wait, re-pump"]
    TIMER --> PUMP
    S1 -->|StageError| RETRY{"decideRetry, TRANSIENT + attempts left?"}
    RETRY -->|retry| BACKOFF["backoff wait, re-run pass"]
    BACKOFF --> S1
    RETRY -->|fail| TASKFAIL["task FAILED"]

    SETTLE --> PERSIST["persist transition, onTaskChanged"]
    TASKFAIL --> PERSIST
    PERSIST --> AFTER["afterTask, pump or checkDone"]
    AFTER --> DONE{"all tasks terminal?"}
    DONE -->|no| PUMP
    DONE -->|yes| JOBTERM["job status = computeStatus, persist, trace COMPLETED"]

    JOBTERM --> ONTERM
    subgraph COMPLETE["RelayPostManager.handleCompletions"]
        ONTERM["onTerminal, SUCCEEDED archives + notifies, else warn"]
        ONTERM --> RELEASE["deps.release context"]
        RELEASE --> FORGET["scheduler.forget job, DB is source of truth"]
    end

    FORGET -.->|persisted terminal status read next cycle| DEQUEUE
```

> Rendering note: GitHub and Mermaid-aware viewers render this natively. VS Code's
> built-in Markdown preview needs the "Markdown Preview Mermaid Support" extension
> (or paste the block into https://mermaid.live to view/validate it).

## Reading the diagram

- **Queue layer** decides *what* runs: it dequeues finished entries (via
  `getOutcome`, scoped by the record's `createdAt`), holds dependency-gated
  ones, and hands eligible submissions to the engine. It never blocks on a
  running job — `enqueue`'s `drain()` is fire-and-forget.
- **Manager** turns a submission into a planned, persisted job tree, deduping
  against any live/orphaned job, then kicks the serialized `drain` loop.
- **Scheduler** runs up to `maxConcurrentJobs` job trees at once; **JobReactor**
  runs up to `maxConcurrentTasks` tasks per job via `fastq`, event-driven.
- **Staged pass** runs shared stages once (Resolve→Validate), then each batch
  **unit** in ascending ordinal order (Gate→Transform→Dispatch→Capture).
  Rate-limit gating **parks** the task (WAITING) rather than failing; genuine
  failures flow through the **retry policy** (TRANSIENT only, bounded backoff).
- **Completion** closes the loop: the job persists its terminal status,
  `handleCompletions` archives/notifies and forgets the job, and the *next*
  queue cycle observes that outcome via `getOutcome` and dequeues the record.

The dashed edge is the async hand-off: the queue and engine are decoupled, and
the persisted job status is what links "post completed" back to "record
dequeued."

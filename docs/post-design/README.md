# Posting Design

## Posting Modes

**NEW** - When a submission is in a new posting state it must completely reset all post
data the preceeded it. Ideally with a new post state rather than deleting the old states.

**CONTINUE** - Resumes the submission's last known posting state. It will retry failed
units of work, and pick up and stage any new plans of work.

## DependsOn Relationship

Submissions will have a new `dependsOn` field that is an array of `SubmissionId`.
This will be used as a gate when determining if a submission can be posted.

Some kind of cycle detection for `DependsOn` relations will need to be implemented
to guard against loops.

## Post Processing

Must allow `n` post to run in parallel the same time. This can be configured, but will
likely be `n=1` to begin.

## Scheduling

**ALL** submissions that are set to post are put on a schedule. If it is not scheduled
by a user directly, schedule time will be set at post time as `Date.now()`, with
multi-scheduling operations inserting a 1 second delay between each, and mark
`isScheduled` as true.

Users will be able to provide whether it is a **CONTINUE** of a prior run or a **NEW**
run.

### Scheduled Submission Kickoff

A 5 second (tbd) timer will execute. It will determine which submissions' schedule has
passed, take only the most stale record (oldest schedule) whose `DependsOn` tree is
satisfied (all submissions have their most recent post record in a complete state or
is archived) and kick off to a handler.

This function will invoke a mutex to protect against multiple executions and ensure
syncronous flow.

The handler will check the follow:

1. Whether or not the submission is already posting (skip and unschedule if true)
2. Whether or not there is space to run it in parallel (stop processing when false)

## Expected Tables

### Table Changes

```ts
interface Submission {
  dependsOn: SubmissionId[]; // +
  isScheduled: boolean; // - (moved to Schedule Table)
  schedule: object; // - (moved to Schedule Table)
}
```

### New Tables

```ts
interface Schedule {
  submissionId: EntityId; // SubmissionId linkage
  isActive: boolean; // Whether or not the schedule is active (previously isScheduled)
  type: 'RECURRING' | 'ONCE';
  cron?: string; // Where a CRON would be stored for the recurring type
  dueAt?: string; // The ISO date string scheduled value
}
```

```ts
interface Post {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  submissionId: SubmissionId; // Associated submission
  isCancelled: boolean;
  completedAllUnits: boolean; // Set when the post has concluded all currently defined units of work. This should not be derived but set on completion of current scheduled work and unset when CONTINUE is executed.
  queuedAt: Date; // Date string to determine when it was added into the queue (ordering prop)
}
```

```ts
// Querying is a composite of the following
// MESSAGE -> (AccountId)
// SUBMISSION -> (AccountId+fileId)
interface PostUnitOfWork {
  id: EntityId;
  createdAt: string;
  postId: EntityId; // Should be deleted by removal of a Post
  accountId: EntityId; // Should be deleted by removal of an Account
  fileId?: EntityId;
  state: 'DONE' | 'FAILED' | 'PENDING' | 'CANCELLED' | 'EXECUTING' | 'RATE_LIMITED';
  version: string; // App Version attempted on last (or created on)
  attempts: number; // Number of retries (for retry execution logic)
  evicted: boolean; // Whether or not the UnitOfWork is evicted (invalidated)
  data?: object; // Represents the POST Data last attempted with this unit of work (for debug)
  response?: PostResponse;
  batchedWith: EntityId[]; // Other units of work batched with
  url?: string; // Potential url generated for the unit of work
}
```

## Thoughts

## Guards

If a `Post` record exists for a submission that is not cancelled or
fully executed, all updates should be blocked to it.

### Post Recovery is innate

On startup, after 60 seconds (or user interaction?)
Pull the oldest, uncancelled unComplete `Post` record.
Resume.


## Mode-less (Eviction-based) Posts

Instead of supporting post objects that are NEW or CONTINUED we will support
an eviction based post. The completion of a submission is determined by the
completion of all units of work at the time a post cycle completes.

Posts will be driven by the difference in plannable units of work vs what is
existing in the database. We will provide the users the ability to evict
specific units of work on three levels (file, website, account).

A submission resumes after 3 minutes after app startup OR once a user submits
a job for posting.

A queue is maintained on the `Post` table using the `queuedAt` field and
`completedAllUnited`. `queuedAt` will maintain the ordering and will be updated
when a new post is kicked off for a submission.


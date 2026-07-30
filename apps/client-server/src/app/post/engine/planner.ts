/**
 * Relay engine — job planner.
 *
 * Builds a job's task/unit tree from its submission and wires source-URL
 * dependencies, and re-opens a tree for resume. Pure planning over the
 * {@link PipelineDeps} seams; no posting happens here.
 */

/* eslint-disable no-param-reassign */ // the planner builds the job tree in place

import {
  Dependency,
  NodeStatus,
  PostRecordResumeMode,
  SubmissionType,
  UnitKind,
} from '@postybirb/types';
import { SOURCE_DEPENDENCY_MODES } from './constants';
import { RelayJob, RelayTask, RelayUnit, isDone } from './model';
import { PipelineDeps, RelaySubmission } from './pipeline-deps.interface';
import { RelayWebsite } from './websites';

/**
 * Build the job's task/unit tree from its submission. Runs in two phases:
 *
 *  1. For every selected (website, account) option, create a RelayTask.
 *     Unsupported pairings (e.g. message submission on a file-only site) and
 *     file submissions with every file excluded are immediately marked
 *     SKIPPED. File tasks are sharded into BATCH units of `fileBatchSize`;
 *     message tasks get one MESSAGE unit.
 *
 *  2. Wire source-URL dependencies. Sites that accept external source URLs
 *     (think: cross-poster bookmark sites) declare a dependency on every
 *     "standard" site so they post after them and can quote their URLs. The
 *     mode (ALL/ALL_SETTLED/ANY/COUNT) decides how many upstreams must be done
 *     first; COUNT is clamped to the actual upstream count to stay satisfiable.
 */
export function planJob(job: RelayJob, deps: PipelineDeps): void {
  const submission = deps.getSubmission(job.id);
  for (const opt of submission.options) {
    const site = deps.getWebsite(job.id, opt.websiteId, opt.accountId);
    job.tasks.push(buildTask(job, opt, site, submission));
  }
  wireSourceDependencies(job, deps);
}

/**
 * Shard a file submission's files into ordered BATCH units of `batchSize`,
 * pushing them onto the task. Files excluded for this account are filtered out
 * upstream by {@link buildTask}.
 */
function shardFilesIntoUnits(
  task: RelayTask,
  files: RelaySubmission['files'],
  batchSize: number,
): void {
  let ordinal = 0;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    task.units.push(
      new RelayUnit({
        id: `${task.id}:b${ordinal}`,
        taskId: task.id,
        kind: UnitKind.BATCH,
        ordinal,
        fileIds: batch.map((f) => f.id),
      }),
    );
    ordinal++;
  }
}

/**
 * Create the RelayTask for one (website, account) option and populate its
 * units. Unsupported pairings (e.g. a message submission on a file-only site)
 * and file submissions with every file excluded are returned already-SKIPPED
 * with no units; file tasks are sharded into BATCH units and message tasks get
 * a single MESSAGE unit.
 */
function buildTask(
  job: RelayJob,
  opt: { accountId: string; websiteId: string },
  site: RelayWebsite,
  submission: RelaySubmission,
): RelayTask {
  const task = new RelayTask({
    id: `${job.id}:t:${opt.websiteId}:${opt.accountId}`,
    jobId: job.id,
    accountId: opt.accountId,
    websiteId: opt.websiteId,
  });

  const supports =
    submission.type === SubmissionType.FILE
      ? site.supportsFile
      : site.supportsMessage;
  if (!supports) {
    task.status = NodeStatus.SKIPPED;
    return task;
  }

  if (submission.type === SubmissionType.FILE) {
    const files = submission.files
      .filter((f) => !f.ignoredWebsites?.includes(opt.accountId))
      .sort((a, b) => a.order - b.order);
    if (files.length === 0) {
      task.status = NodeStatus.SKIPPED;
    } else {
      shardFilesIntoUnits(task, files, site.fileBatchSize);
    }
  } else {
    task.units.push(
      new RelayUnit({
        id: `${task.id}:m`,
        taskId: task.id,
        kind: UnitKind.MESSAGE,
        ordinal: 0,
      }),
    );
  }

  return task;
}

/** Build the source-URL dependency gate for an external-source site. */
function buildSourceDependency(
  mode: RelayWebsite['sourceDependencyMode'],
  standardIds: string[],
): Dependency {
  if (mode === SOURCE_DEPENDENCY_MODES.ALL) {
    return { mode: SOURCE_DEPENDENCY_MODES.ALL, tasks: standardIds };
  }
  if (mode === SOURCE_DEPENDENCY_MODES.ALL_SETTLED) {
    return { mode: SOURCE_DEPENDENCY_MODES.ALL_SETTLED, tasks: standardIds };
  }
  if (mode === SOURCE_DEPENDENCY_MODES.ANY) {
    return { mode: SOURCE_DEPENDENCY_MODES.ANY, tasks: standardIds };
  }
  return {
    mode: SOURCE_DEPENDENCY_MODES.COUNT,
    tasks: standardIds,
    n: Math.min(mode.count, standardIds.length),
  };
}

/**
 * Wire source-URL dependencies: sites that accept external source URLs depend
 * on every "standard" (non-external-source) task so they post afterwards and
 * can quote their source URLs. The mode decides how many upstreams must be done
 * first; COUNT is clamped to the upstream count by {@link buildSourceDependency}
 * to stay satisfiable. User-supplied source URLs on the files do NOT skip the
 * gate — they are additive to the upstream URLs, not a replacement.
 */
function wireSourceDependencies(job: RelayJob, deps: PipelineDeps): void {
  const standardIds = job.tasks
    .filter(
      (t) =>
        t.status !== NodeStatus.SKIPPED &&
        !deps.getWebsite(job.id, t.websiteId, t.accountId)
          .acceptsExternalSourceUrls,
    )
    .map((t) => t.id);
  if (standardIds.length === 0) return;

  for (const t of job.tasks) {
    if (t.status === NodeStatus.SKIPPED) continue;
    const site = deps.getWebsite(job.id, t.websiteId, t.accountId);
    if (!site.acceptsExternalSourceUrls) continue;
    t.dependency = buildSourceDependency(site.sourceDependencyMode, standardIds);
  }
}

/**
 * Resume planner. Re-opens non-done nodes to QUEUED.
 *  - CONTINUE: keep SUCCEEDED units, re-run the rest.
 *  - CONTINUE_RETRY: re-run every unit of a destination that still has work
 *    (full re-upload), but never a destination that already finished.
 *  - NEW handled by the caller (builds a fresh job).
 *
 * A destination whose units are all done is left SUCCEEDED in *every* mode:
 * re-sending it would duplicate a post that already went out.
 */
export function resetForResume(
  job: RelayJob,
  mode: PostRecordResumeMode,
): void {
  for (const task of job.tasks) {
    if (task.status === NodeStatus.SKIPPED) continue;

    if (task.units.length > 0 && task.units.every(isDone)) {
      task.status = NodeStatus.SUCCEEDED;
      task.error = undefined;
      task.waitingUntil = undefined;
      continue;
    }

    for (const unit of task.units) {
      if (mode === PostRecordResumeMode.CONTINUE_RETRY) {
        unit.status = NodeStatus.QUEUED;
        unit.sourceUrl = undefined;
        unit.error = undefined;
      } else if (!isDone(unit)) {
        unit.status = NodeStatus.QUEUED;
        unit.error = undefined;
      }
    }

    if (mode === PostRecordResumeMode.CONTINUE_RETRY) {
      // Nothing of this task survives the re-upload, so the URL downstream
      // sites would quote is stale.
      task.sourceUrl = undefined;
    }

    task.status = NodeStatus.QUEUED;
    task.error = undefined;
    task.waitingUntil = undefined;
    // Persisted attempts survive a DB load, so without this an adopted or
    // resumed task would run with its retry budget already spent.
    task.attempts = 0;
  }
}

/** Identifies a task across attempts: same website account, same submission. */
function taskKey(task: RelayTask): string {
  return `${task.websiteId}:${task.accountId}`;
}

/**
 * Identifies a unit across attempts by *what it posts* rather than by its
 * ordinal, so that editing the submission's files between attempts cannot
 * make a new batch inherit an old batch's "already posted" status.
 */
function unitKey(unit: RelayUnit): string {
  return `${unit.kind}:${[...unit.fileIds].sort().join(',')}`;
}

/**
 * Copy the outcome of a previous attempt onto a freshly-planned job tree so a
 * resume does not re-post work that already went out. Node ids are namespaced
 * per job, so nodes are matched by what they target rather than by id; nodes
 * with no counterpart in the previous attempt (a newly-selected website, a
 * newly-added file) stay QUEUED and will be posted.
 *
 * Call {@link resetForResume} afterwards to re-open the nodes the chosen mode
 * wants to re-run.
 */
export function seedFromPreviousAttempt(
  job: RelayJob,
  previous: RelayJob,
): void {
  const previousTasks = new Map(previous.tasks.map((t) => [taskKey(t), t]));

  for (const task of job.tasks) {
    if (task.status === NodeStatus.SKIPPED) continue;
    const previousTask = previousTasks.get(taskKey(task));
    if (!previousTask) continue;

    const previousUnits = new Map(
      previousTask.units.map((u) => [unitKey(u), u]),
    );
    for (const unit of task.units) {
      const previousUnit = previousUnits.get(unitKey(unit));
      if (!previousUnit || !isDone(previousUnit)) continue;
      unit.status = previousUnit.status;
      unit.sourceUrl = previousUnit.sourceUrl;
    }

    // Downstream sites quote this, so it may only come from a batch that both
    // already posted and still exists in the current plan.
    task.sourceUrl = task.units.find(
      (unit) => isDone(unit) && unit.sourceUrl,
    )?.sourceUrl;
  }
}

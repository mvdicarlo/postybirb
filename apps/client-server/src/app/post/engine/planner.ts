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
 * to stay satisfiable.
 */
function wireSourceDependencies(job: RelayJob, deps: PipelineDeps): void {
  const submission = deps.getSubmission(job.id);
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
    // Best-effort short-circuit: if the user already supplied a source URL on
    // every file this account will post, the site already has its sources and
    // has nothing to wait for — leave it ungated so it posts immediately.
    if (allFilesHaveUserSourceUrls(submission, t.accountId)) continue;
    t.dependency = buildSourceDependency(site.sourceDependencyMode, standardIds);
  }
}

/**
 * True when this is a file submission and every file the account will post
 * already carries at least one user-provided source URL — so an external-source
 * site has nothing to gain by waiting on upstream posts.
 */
function allFilesHaveUserSourceUrls(
  submission: RelaySubmission,
  accountId: string,
): boolean {
  if (submission.type !== SubmissionType.FILE) return false;
  const files = submission.files.filter(
    (f) => !f.ignoredWebsites?.includes(accountId),
  );
  return files.length > 0 && files.every((f) => (f.sourceUrls?.length ?? 0) > 0);
}

/**
 * Resume planner. Re-opens non-done nodes to QUEUED.
 *  - CONTINUE: keep SUCCEEDED units, re-run the rest.
 *  - CONTINUE_RETRY: also re-run SUCCEEDED units (full re-upload).
 *  - NEW handled by the caller (builds a fresh job).
 */
export function resetForResume(
  job: RelayJob,
  mode: PostRecordResumeMode,
): void {
  for (const task of job.tasks) {
    if (task.status === NodeStatus.SKIPPED) continue;
    let hasWork = false;
    for (const unit of task.units) {
      if (mode === PostRecordResumeMode.CONTINUE_RETRY) {
        unit.status = NodeStatus.QUEUED;
        unit.sourceUrl = undefined;
        unit.error = undefined;
      } else if (!isDone(unit)) {
        unit.status = NodeStatus.QUEUED;
        unit.error = undefined;
      }
      if (!isDone(unit)) hasWork = true;
    }
    if (hasWork || task.units.length === 0) {
      task.status = NodeStatus.QUEUED;
      task.error = undefined;
      task.waitingUntil = undefined;
    } else {
      task.status = NodeStatus.SUCCEEDED;
    }
  }
}

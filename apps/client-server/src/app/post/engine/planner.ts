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
  SubmissionFileId,
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
 * Shard file ids into ordered BATCH units of `batchSize`, numbering them from
 * `startOrdinal` so a caller can append to units that already exist.
 */
function buildBatchUnits(
  task: RelayTask,
  fileIds: SubmissionFileId[],
  batchSize: number,
  startOrdinal = 0,
): RelayUnit[] {
  const units: RelayUnit[] = [];
  for (let i = 0; i < fileIds.length; i += batchSize) {
    const ordinal = startOrdinal + units.length;
    units.push(
      new RelayUnit({
        id: `${task.id}:b${ordinal}`,
        taskId: task.id,
        kind: UnitKind.BATCH,
        ordinal,
        fileIds: fileIds.slice(i, i + batchSize),
      }),
    );
  }
  return units;
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
  task.units.push(
    ...buildBatchUnits(
      task,
      files.map((file) => file.id),
      batchSize,
    ),
  );
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
    t.dependency = buildSourceDependency(
      site.sourceDependencyMode,
      standardIds,
    );
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
 * re-sending it would duplicate a post that already went out. Which of the
 * previous attempt's work is still "done" is decided by
 * {@link seedFromPreviousAttempts}, so this only has to re-open the rest.
 */
export function resetForResume(job: RelayJob): void {
  for (const task of job.tasks) {
    if (task.status === NodeStatus.SKIPPED) continue;

    if (task.units.length > 0 && task.units.every(isDone)) {
      task.status = NodeStatus.SUCCEEDED;
      task.error = undefined;
      task.waitingUntil = undefined;
      continue;
    }

    for (const unit of task.units) {
      if (isDone(unit)) continue;
      unit.status = NodeStatus.QUEUED;
      unit.error = undefined;
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

interface SuccessfulUnitReceipt {
  groupKey: string;
  sourceUrl?: string;
  sequence: number;
}

interface DestinationDeliveryCheckpoint {
  fileReceipts: Map<SubmissionFileId, SuccessfulUnitReceipt>;
  messageReceipt?: SuccessfulUnitReceipt;
  lastPlannedComplete: boolean;
}

interface ReceiptGroup {
  receipt: SuccessfulUnitReceipt;
  fileIds: SubmissionFileId[];
}

function checkpointFor(
  checkpoints: Map<string, DestinationDeliveryCheckpoint>,
  key: string,
): DestinationDeliveryCheckpoint {
  let checkpoint = checkpoints.get(key);
  if (!checkpoint) {
    checkpoint = {
      fileReceipts: new Map(),
      lastPlannedComplete: false,
    };
    checkpoints.set(key, checkpoint);
  }
  return checkpoint;
}

function isFullyDelivered(task: RelayTask): boolean {
  return (
    task.units.length > 0 &&
    task.units.every((unit) => unit.status === NodeStatus.SUCCEEDED)
  );
}

export function restoreFileTaskSourceUrl(task: RelayTask): void {
  task.sourceUrl ??= task.units.find(
    (unit) =>
      unit.kind === UnitKind.BATCH &&
      unit.status === NodeStatus.SUCCEEDED &&
      !!unit.sourceUrl,
  )?.sourceUrl;
}

function foldDeliveryCheckpoints(
  previousAttempts: readonly RelayJob[],
): Map<string, DestinationDeliveryCheckpoint> {
  const checkpoints = new Map<string, DestinationDeliveryCheckpoint>();
  let sequence = 0;

  for (const attempt of [...previousAttempts].reverse()) {
    for (const task of attempt.tasks) {
      const checkpoint = checkpointFor(checkpoints, taskKey(task));
      if (
        attempt.resumeMode === PostRecordResumeMode.CONTINUE_RETRY &&
        !checkpoint.lastPlannedComplete
      ) {
        checkpoint.fileReceipts.clear();
        checkpoint.messageReceipt = undefined;
      }

      for (const unit of [...task.units].sort(
        (left, right) => left.ordinal - right.ordinal,
      )) {
        if (unit.status !== NodeStatus.SUCCEEDED) continue;
        const receipt: SuccessfulUnitReceipt = {
          groupKey: unit.id,
          sourceUrl: unit.sourceUrl,
          sequence: sequence++,
        };
        if (unit.kind === UnitKind.MESSAGE) {
          checkpoint.messageReceipt = receipt;
        } else {
          for (const fileId of unit.fileIds) {
            checkpoint.fileReceipts.set(fileId, receipt);
          }
        }
      }

      checkpoint.lastPlannedComplete = isFullyDelivered(task);
    }
  }

  return checkpoints;
}

function preferredReceiptGroup(
  task: RelayTask,
  groups: ReadonlyMap<string, ReceiptGroup>,
  previousAttempts: readonly RelayJob[],
): string | undefined {
  for (const attempt of previousAttempts) {
    const historicalTask = attempt.tasks.find(
      (candidate) => taskKey(candidate) === taskKey(task),
    );
    const sourceUrl = historicalTask?.sourceUrl;
    if (!sourceUrl) continue;
    const matching = [...groups.entries()]
      .filter(([, group]) => group.receipt.sourceUrl === sourceUrl)
      .sort(
        ([, left], [, right]) => right.receipt.sequence - left.receipt.sequence,
      );
    if (matching.length > 0) return matching[0][0];
  }

  return [...groups.entries()].sort(
    ([, left], [, right]) => right.receipt.sequence - left.receipt.sequence,
  )[0]?.[0];
}

function seedFileTask(
  task: RelayTask,
  checkpoint: DestinationDeliveryCheckpoint,
  batchSize: number,
  previousAttempts: readonly RelayJob[],
): void {
  const plannedFileIds = task.units.flatMap((unit) => unit.fileIds);
  const groups = new Map<string, ReceiptGroup>();
  for (const fileId of plannedFileIds) {
    const receipt = checkpoint.fileReceipts.get(fileId);
    if (!receipt) continue;
    const group = groups.get(receipt.groupKey);
    if (group) {
      group.fileIds.push(fileId);
    } else {
      groups.set(receipt.groupKey, { receipt, fileIds: [fileId] });
    }
  }
  if (groups.size === 0) return;

  const preferred = preferredReceiptGroup(task, groups, previousAttempts);
  const orderedGroups = [...groups.entries()].sort(
    ([leftKey, left], [rightKey, right]) => {
      if (leftKey === preferred) return -1;
      if (rightKey === preferred) return 1;
      return left.receipt.sequence - right.receipt.sequence;
    },
  );
  const posted = orderedGroups.map(([, group], ordinal) => {
    const unit = new RelayUnit({
      id: `${task.id}:b${ordinal}`,
      taskId: task.id,
      kind: UnitKind.BATCH,
      ordinal,
      fileIds: group.fileIds,
    });
    unit.status = NodeStatus.SUCCEEDED;
    unit.sourceUrl = group.receipt.sourceUrl;
    return unit;
  });

  const remaining = plannedFileIds.filter(
    (fileId) => !checkpoint.fileReceipts.has(fileId),
  );
  task.units = [
    ...posted,
    ...buildBatchUnits(task, remaining, batchSize, posted.length),
  ];
  const hasQueuedWork = task.units.some(
    (unit) => unit.status === NodeStatus.QUEUED,
  );
  task.sourceUrl = hasQueuedWork
    ? undefined
    : task.units.find(
        (unit) => unit.status === NodeStatus.SUCCEEDED && !!unit.sourceUrl,
      )?.sourceUrl;
}

/**
 * Copy the outcome of a previous attempt onto a freshly-planned job tree so a
 * resume does not re-post work that already went out. Node ids are namespaced
 * per job, so nodes are matched by what they target rather than by id; work
 * with no counterpart in the previous attempt (a newly-selected website, a
 * newly-added file) stays QUEUED and will be posted.
 *
 * Call {@link resetForResume} afterwards to re-open the nodes the chosen mode
 * wants to re-run.
 */
export function seedFromPreviousAttempts(
  job: RelayJob,
  previousAttempts: readonly RelayJob[],
  mode: PostRecordResumeMode,
  deps: PipelineDeps,
): void {
  const checkpoints = foldDeliveryCheckpoints(previousAttempts);

  for (const task of job.tasks) {
    if (task.status === NodeStatus.SKIPPED) continue;
    const checkpoint = checkpoints.get(taskKey(task));
    if (!checkpoint) continue;
    if (
      mode === PostRecordResumeMode.CONTINUE_RETRY &&
      !checkpoint.lastPlannedComplete
    ) {
      continue;
    }

    if (task.units[0]?.kind === UnitKind.MESSAGE) {
      const receipt = checkpoint.messageReceipt;
      if (!receipt) continue;
      const unit = new RelayUnit({
        id: `${task.id}:m`,
        taskId: task.id,
        kind: UnitKind.MESSAGE,
        ordinal: 0,
      });
      unit.status = NodeStatus.SUCCEEDED;
      unit.sourceUrl = receipt.sourceUrl;
      task.units = [unit];
      task.sourceUrl = receipt.sourceUrl;
      continue;
    }

    const site = deps.getWebsite(job.id, task.websiteId, task.accountId);
    seedFileTask(task, checkpoint, site.fileBatchSize, previousAttempts);
  }
}

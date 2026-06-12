/**
 * Relay engine — post manager (orchestration entrypoint).
 *
 * Wires the engine into the application lifecycle:
 *   - enqueue(submissionId, resumeMode): load the submission, plan a job tree,
 *     persist it, and run it (persisting every transition).
 *   - cancel(submissionId): abort any in-flight job for the submission.
 *   - onModuleInit: crash recovery — load active (non-terminal) jobs from the
 *     database and resume them once the website registry is ready.
 *
 * Driven by the PostQueueService, which is the sole posting executor.
 */

import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import {
    JobTreeNode,
    NodeStatus,
    PostRecordResumeMode,
    ScheduleType,
    SubmissionId,
} from '@postybirb/types';
import { IsTestEnvironment } from '@postybirb/utils/common';
import { Mutex } from 'async-mutex';
import { NotificationsService } from '../../notifications/notifications.service';
import { SubmissionService } from '../../submission/services/submission.service';
import { WebsiteRegistryService } from '../../websites/website-registry.service';
import { RelayJob, TERMINAL_ALL, computeJobStatus } from './model';
import { RelayPersistence } from './persistence';
import { resetForResume } from './pipeline';
import { RelayPipelineDeps } from './pipeline-deps';
import { RelayScheduler } from './scheduler';
import { projectJob } from './tracer.service';

@Injectable()
export class RelayPostManager implements OnModuleInit {
  private readonly logger = Logger(this.constructor.name);

  private readonly scheduler: RelayScheduler;

  private readonly runMutex = new Mutex();

  /** submissionId -> active jobId, so cancel/dedup can find the running job. */
  private readonly activeBySubmission = new Map<SubmissionId, string>();

  /** submissionId -> terminal status, awaiting the queue to acknowledge/dequeue. */
  private readonly outcomes = new Map<SubmissionId, NodeStatus>();

  /** jobId -> timer that re-drives drain() when a future scheduledFor arrives. */
  private readonly scheduleTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly deps: RelayPipelineDeps,
    private readonly persistence: RelayPersistence,
    private readonly websiteRegistry: WebsiteRegistryService,
    @Optional() private readonly submissionService?: SubmissionService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {
    this.scheduler = new RelayScheduler(this.deps, {
      maxConcurrentJobs: 3,
      maxConcurrentTasks: 4,
      onTaskChanged: (job, task) => this.persistence.saveTask(task),
      onJobChanged: (job) => this.persistence.save(job),
    });
  }

  async onModuleInit(): Promise<void> {
    if (IsTestEnvironment()) return;
    // Recover in the background so startup is not blocked.
    this.recover().catch((error) =>
      this.logger.withError(error).error('Relay crash recovery failed'),
    );
    // Prune old on-disk trace logs so they don't accumulate unbounded.
    this.deps.tracer
      .pruneOldLogs()
      .then((deleted) => {
        if (deleted > 0) {
          this.logger
            .withMetadata({ deleted })
            .info('Pruned old Relay trace logs');
        }
      })
      .catch((error) =>
        this.logger.withError(error).warn('Failed to prune Relay trace logs'),
      );
  }

  /** Resume any active (non-terminal) jobs left over from a crash/shutdown. */
  async recover(): Promise<void> {
    try {
      const active = await this.persistence.loadActive();
      if (active.length === 0) return;

      this.logger
        .withMetadata({ count: active.length })
        .info('Recovering interrupted Relay jobs');

      const ready = await this.waitForRegistry();
      if (!ready) {
        // The website registry never came up. Do NOT leave the active rows
        // dangling RUNNING (the queue would create duplicates): the enqueue
        // reconcile path will adopt or fail them on the next queue cycle. Log
        // and bail rather than half-recovering.
        this.logger.error(
          'Website registry not ready; deferring Relay recovery to enqueue reconcile',
        );
        return;
      }

      // Each job's recovery is isolated so a single bad job (e.g. its
      // submission was deleted while the app was closed, or its website
      // implementation no longer exists) cannot prevent the rest of the
      // active jobs from being adopted. A poison job is force-marked
      // terminal-FAILED in the DB so it leaves the active set forever and
      // cannot become a stuck row the user is unable to clear.
      for (const job of active) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await this.deps.prepare(job);
          resetForResume(job, PostRecordResumeMode.CONTINUE);
          this.scheduler.adopt(job);
          this.activeBySubmission.set(job.submissionId, job.id);
        } catch (error) {
          this.logger
            .withError(error)
            .withMetadata({ jobId: job.id, submissionId: job.submissionId })
            .error('Failed to recover job; marking it FAILED');
          // eslint-disable-next-line no-await-in-loop
          await this.persistence
            .failJob(job.id, (error as Error)?.message ?? 'recovery failed')
            .catch((e) =>
              this.logger
                .withError(e)
                .error('Failed to mark unrecoverable job FAILED'),
            );
        }
      }
      this.drain().catch((error) =>
        this.logger.withError(error).error('Relay run failed'),
      );
    } catch (error) {
      this.logger.withError(error).error('Relay crash recovery failed');
    }
  }

  /** Wait for the website registry, retrying a few times before giving up. */
  private async waitForRegistry(): Promise<boolean> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await this.websiteRegistry.waitForInitialization(60_000);
        return true;
      } catch (error) {
        this.logger
          .withError(error)
          .withMetadata({ attempt })
          .warn('Website registry not yet ready; retrying');
      }
    }
    return false;
  }

  /**
   * Enqueue a submission: prepare context, plan a job, persist the tree, run.
   * Returns the created job id. `schedule` carries optional priority/scheduledFor.
   */
  async enqueue(
    submissionId: SubmissionId,
    resumeMode: PostRecordResumeMode = PostRecordResumeMode.NEW,
    schedule?: { priority?: number; scheduledFor?: number },
  ): Promise<string> {
    // Guard against duplicate jobs (e.g. the queue cron re-driving enqueue
    // while a job is briefly between states).
    const existing = this.activeBySubmission.get(submissionId);
    if (existing) return existing;

    // Reconcile against the DB: a non-terminal job may exist on disk but not
    // be tracked in memory (e.g. crash recovery couldn't bring up the website
    // registry, so the job was never adopted). Adopt + resume it instead of
    // creating a duplicate post_job row that would race the orphan.
    const adopted = await this.adoptOrphanJob(submissionId);
    if (adopted) return adopted;

    const job = this.scheduler.createJob(submissionId, {
      resumeMode,
      priority: schedule?.priority,
      scheduledFor: schedule?.scheduledFor,
    });
    await this.deps.prepare(job);
    this.scheduler.plan(job);
    await this.persistence.create(
      job,
      process.env.POSTYBIRB_VERSION ?? undefined,
    );
    this.activeBySubmission.set(submissionId, job.id);
    this.outcomes.delete(submissionId);
    // If the job is scheduled for the future, runToIdle won't pick it up yet
    // and nothing else re-drives the scheduler. Arm a timer so the job runs
    // when its time arrives even with no other queue activity.
    this.armScheduleTimer(job.id, schedule?.scheduledFor);
    this.drain().catch((error) =>
      this.logger.withError(error).error('Relay run failed'),
    );
    return job.id;
  }

  /** Arm (or replace) a one-shot timer to re-drive drain() at `scheduledFor`. */
  private armScheduleTimer(jobId: string, scheduledFor?: number): void {
    const existing = this.scheduleTimers.get(jobId);
    if (existing) {
      clearTimeout(existing);
      this.scheduleTimers.delete(jobId);
    }
    if (scheduledFor === undefined) return;
    const delay = scheduledFor - Date.now();
    if (delay <= 0) return; // already due; the immediate drain() handles it
    const timer = setTimeout(() => {
      this.scheduleTimers.delete(jobId);
      this.drain().catch((error) =>
        this.logger.withError(error).error('Relay scheduled run failed'),
      );
    }, delay);
    // Don't keep the event loop / app alive solely for a scheduled post.
    timer.unref?.();
    this.scheduleTimers.set(jobId, timer);
  }

  /** Cancel any pending scheduled-run timer for a job. */
  private clearScheduleTimer(jobId: string): void {
    const timer = this.scheduleTimers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.scheduleTimers.delete(jobId);
    }
  }

  /**
   * Look for an untracked non-terminal job for the submission in the DB and
   * adopt it (resume) rather than creating a duplicate. If the orphan cannot
   * be brought back (e.g. its website registry/submission is gone) it is
   * force-failed so it stops blocking and a fresh job can be created.
   * Returns the adopted job id, or undefined if there was nothing to adopt.
   */
  private async adoptOrphanJob(
    submissionId: SubmissionId,
  ): Promise<string | undefined> {
    const jobs = await this.persistence.loadBySubmission(submissionId);
    const orphan = jobs.find((j) => !TERMINAL_ALL.has(j.status));
    if (!orphan) return undefined;

    // Already tracked by the scheduler (race) — just re-link and drive it.
    const tracked = this.scheduler.getJob(orphan.id);
    if (tracked && !TERMINAL_ALL.has(tracked.status)) {
      this.activeBySubmission.set(submissionId, tracked.id);
      this.drain().catch((error) =>
        this.logger.withError(error).error('Relay run failed'),
      );
      return tracked.id;
    }

    try {
      const ready = await this.waitForRegistry();
      if (!ready) throw new Error('website registry not ready');
      await this.deps.prepare(orphan);
      resetForResume(orphan, PostRecordResumeMode.CONTINUE);
      this.scheduler.adopt(orphan);
      this.activeBySubmission.set(submissionId, orphan.id);
      this.logger
        .withMetadata({ jobId: orphan.id, submissionId })
        .info('Adopted orphaned Relay job on enqueue');
      this.drain().catch((error) =>
        this.logger.withError(error).error('Relay run failed'),
      );
      return orphan.id;
    } catch (error) {
      this.logger
        .withError(error)
        .withMetadata({ jobId: orphan.id, submissionId })
        .error('Could not adopt orphaned job; marking it FAILED');
      await this.persistence
        .failJob(orphan.id, (error as Error)?.message ?? 'adopt failed')
        .catch((e) =>
          this.logger.withError(e).error('Failed to mark orphan job FAILED'),
        );
      return undefined;
    }
  }

  /**
   * Cancel any in-flight job for a submission. If no live job is registered
   * (e.g. a previous recovery silently dropped the job, or the scheduler
   * never adopted it), fall back to a DB sweep that marks every non-terminal
   * `post_job` row for the submission as CANCELLED. This guarantees the user
   * always has a way to clear a stuck record.
   */
  cancel(submissionId: SubmissionId): boolean {
    const jobId = this.activeBySubmission.get(submissionId);
    if (jobId) {
      this.clearScheduleTimer(jobId);
      this.scheduler.cancel(jobId);
      return true;
    }
    // Background: persistence writes errors must not block the UI cancel.
    this.persistence
      .cancelNonTerminalForSubmission(submissionId)
      .then((cleared) => {
        if (cleared > 0) {
          this.logger
            .withMetadata({ submissionId, cleared })
            .info('Force-cleared stuck post-job rows on cancel');
        }
      })
      .catch((error) =>
        this.logger
          .withError(error)
          .withMetadata({ submissionId })
          .error('Failed to force-clear stuck post-job rows'),
      );
    return false;
  }

  isPosting(submissionId: SubmissionId): boolean {
    const jobId = this.activeBySubmission.get(submissionId);
    if (!jobId) return false;
    const job = this.scheduler.getJob(jobId);
    return !!job && !TERMINAL_ALL.has(job.status);
  }

  /**
   * Snapshot of all currently-active job trees as UI projections. Used by the
   * UI on load/reconnect to seed its store (deltas keep it live thereafter).
   */
  getActiveTrees(): JobTreeNode[] {
    const trees: JobTreeNode[] = [];
    for (const jobId of this.activeBySubmission.values()) {
      const job = this.scheduler.getJob(jobId);
      if (job && !TERMINAL_ALL.has(job.status)) trees.push(projectJob(job));
    }
    return trees;
  }

  /**
   * Posting history for a submission: every persisted job tree (newest first),
   * with any currently in-flight job overlaid from memory so it reflects the
   * latest live state rather than the last-persisted snapshot.
   */
  async getHistory(submissionId: SubmissionId): Promise<JobTreeNode[]> {
    const jobs = await this.persistence.loadBySubmission(submissionId);
    return jobs.map((job) => {
      const live = this.scheduler.getJob(job.id);
      return projectJob(live ?? job);
    });
  }

  /** Terminal outcome awaiting queue acknowledgement (undefined if none). */
  getOutcome(submissionId: SubmissionId): NodeStatus | undefined {
    return this.outcomes.get(submissionId);
  }

  /** Queue acknowledges a terminal outcome (after dequeue). */
  acknowledge(submissionId: SubmissionId): void {
    this.outcomes.delete(submissionId);
  }

  /** Drive the scheduler to idle, then run terminal handling. Serialized. */
  private async drain(): Promise<void> {
    if (this.runMutex.isLocked()) return; // a drain is already running
    const release = await this.runMutex.acquire();
    try {
      await this.scheduler.runToIdle();
      await this.handleCompletions();
    } catch (error) {
      this.logger.withError(error).error('Relay run failed');
    } finally {
      release();
    }
  }

  /** Archive/notify for jobs that have reached a terminal state. */
  private async handleCompletions(): Promise<void> {
    for (const [submissionId, jobId] of [...this.activeBySubmission]) {
      const job = this.scheduler.getJob(jobId);
      if (!job || !TERMINAL_ALL.has(job.status)) continue;
      this.activeBySubmission.delete(submissionId);
      this.clearScheduleTimer(jobId);
      this.outcomes.set(submissionId, computeJobStatus(job));
      // eslint-disable-next-line no-await-in-loop
      await this.onTerminal(job);
      this.deps.release(job.id);
      // Drop the finished job tree from the scheduler's live working set so a
      // long-running process doesn't retain every job ever posted. Persistent
      // history is served from the database (getHistory); the scheduler keeps
      // only a small bounded cache of the most recent completions.
      this.scheduler.forget(job.id);
    }
  }

  private async onTerminal(job: RelayJob): Promise<void> {
    const status = computeJobStatus(job);
    if (status === NodeStatus.SUCCEEDED) {
      try {
        const submission = this.deps.getSubmission(job.id);
        const isRecurring =
          // schedule lives on the raw submission; recurring jobs re-spawn
          (submission as unknown as { scheduleType?: ScheduleType })
            .scheduleType === ScheduleType.RECURRING;
        if (!isRecurring) {
          await this.submissionService?.archive(job.submissionId);
        }
      } catch (error) {
        this.logger.withError(error).warn('Relay terminal archive failed');
      }
      await this.notifications?.create({
        type: 'success',
        title: 'Post Completed',
        message: 'Submission posted successfully',
        tags: ['post-success'],
        data: { submissionId: job.submissionId },
      });
    } else {
      await this.notifications?.create({
        type: 'warning',
        title: 'Post Incomplete',
        message: 'Submission failed to post to one or more websites',
        tags: ['post-incomplete'],
        data: { submissionId: job.submissionId },
      });
    }
  }
}

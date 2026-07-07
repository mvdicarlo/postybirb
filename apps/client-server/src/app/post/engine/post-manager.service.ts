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
import { RelayJob, isTerminal } from './model';
import { RelayPersistence } from './persistence';
import { resetForResume } from './pipeline';
import { RelayPipelineDeps } from './pipeline-deps';
import { RelayScheduler } from './scheduler';
import { projectJob } from './tracer.service';

@Injectable()
export class RelayPostManager implements OnModuleInit {
  private readonly logger = Logger(this.constructor.name);

  private readonly scheduler: RelayScheduler;

  private readonly recoveryMutex = new Mutex();

  private readonly runMutex = new Mutex();

  private recoveryAttempt: Promise<void> | undefined;

  /**
   * Set whenever {@link drain} is invoked. A drain that finds another already
   * in flight sets this instead of queueing a second run; the in-flight drain
   * checks it after each `runToIdle` pass and loops again if set. This closes
   * the window where a job enqueued *after* `runToIdle` returned but *before*
   * the mutex released would otherwise sit idle (and be masked by isPosting)
   * until an unrelated submission triggered the next drain.
   */
  private drainRerunRequested = false;

  constructor(
    private readonly deps: RelayPipelineDeps,
    private readonly persistence: RelayPersistence,
    private readonly websiteRegistry: WebsiteRegistryService,
    @Optional() private readonly submissionService?: SubmissionService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {
    this.scheduler = new RelayScheduler(this.deps, {
      maxConcurrentJobs: 1, // Set to 1 to keep similar to what users expect at the moment
      maxConcurrentTasks: 4,
      onTaskChanged: (job, task) => this.persistence.saveTask(task),
      onJobChanged: (job) => this.persistence.save(job),
    });
  }

  async onModuleInit(): Promise<void> {
    if (IsTestEnvironment()) return;
    // Recover in the background so startup is not blocked.
    this.recoveryAttempt = this.recover();
    this.recoveryAttempt.catch((error) =>
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
    const release = await this.recoveryMutex.acquire();
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
          
          await this.deps.prepare(job);
          resetForResume(job, PostRecordResumeMode.CONTINUE);
          this.scheduler.adopt(job);
        } catch (error) {
          this.logger
            .withError(error)
            .withMetadata({ jobId: job.id, submissionId: job.submissionId })
            .error('Failed to recover job; marking it FAILED');
          
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
    } finally {
      release();
    }
  }

  /** Ensure startup recovery has had a chance to reconcile persisted jobs. */
  private async waitForRecoveryAttempt(): Promise<void> {
    if (!this.recoveryAttempt) return;
    await this.recoveryAttempt;
  }

  private isTerminalStatus(status: NodeStatus): boolean {
    return isTerminal(status);
  }

  private isActiveJob(job: RelayJob | undefined): job is RelayJob {
    return !!job && !this.isTerminalStatus(job.status);
  }

  /** Wait for the website registry, retrying a few times before giving up. */
  private async waitForRegistry(): Promise<boolean> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        
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
   * Returns the created job id.
   */
  async enqueue(
    submissionId: SubmissionId,
    resumeMode: PostRecordResumeMode = PostRecordResumeMode.NEW,
  ): Promise<string> {
    await this.waitForRecoveryAttempt();

    // Guard against duplicate jobs (e.g. the queue cron re-driving enqueue
    // while a job is briefly between states). The scheduler's live working set
    // is the source of truth for what is currently running.
    const existing = this.scheduler.getActiveJobForSubmission(submissionId);
    if (existing) return existing.id;

    // Reconcile against the DB: a non-terminal job may exist on disk but not
    // be tracked in memory (e.g. crash recovery couldn't bring up the website
    // registry, so the job was never adopted). Adopt + resume it instead of
    // creating a duplicate post_job row that would race the orphan.
    const adopted = await this.adoptOrphanJob(submissionId);
    if (adopted) return adopted;

    const job = this.scheduler.createJob(submissionId, {
      resumeMode,
    });

    try {
      await this.deps.prepare(job);
      this.scheduler.plan(job);
      await this.persistence.create(
        job,
        process.env.POSTYBIRB_VERSION ?? undefined,
      );
      this.drain().catch((error) =>
        this.logger
          .withError(error)
          .error(`Relay run failed for job ${job.id}`),
      );
      return job.id;
    } catch (error) {
      this.deps.release(job.id);
      this.scheduler.discard(job.id);
      this.logger
        .withError(error)
        .withMetadata({ jobId: job.id, submissionId })
        .error('Relay enqueue failed; rolled back in-memory job state');
      throw error;
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
    const orphan = jobs.find((job) => !this.isTerminalStatus(job.status));
    if (!orphan) return undefined;

    // Already tracked by the scheduler (race) — just re-link and drive it.
    const tracked = this.scheduler.getJob(orphan.id);
    if (this.isActiveJob(tracked)) {
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
    const job = this.scheduler.getActiveJobForSubmission(submissionId);
    if (job) {
      this.scheduler.cancel(job.id);
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
    return this.isActiveJob(
      this.scheduler.getActiveJobForSubmission(submissionId),
    );
  }

  /**
   * Snapshot of all currently-active job trees as UI projections. Used by the
   * UI on load/reconnect to seed its store (deltas keep it live thereafter).
   */
  getActiveTrees(): JobTreeNode[] {
    return this.scheduler.getActiveJobs().map((job) => projectJob(job));
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

  /**
   * The terminal outcome of the submission's current queue entry, or undefined
   * if it is still in flight / has not produced one. A tracked live
   * (non-terminal) job means the attempt is still running; otherwise the newest
   * persisted job decides, but only if it was created at/after `since` (the
   * queue record's createdAt) so an outcome from an earlier post is not
   * mistaken for the current entry's result.
   */
  async getOutcome(
    submissionId: SubmissionId,
    since: string,
  ): Promise<NodeStatus | undefined> {
    if (this.scheduler.getActiveJobForSubmission(submissionId)) {
      return undefined;
    }
    return this.persistence.outcomeSince(submissionId, since);
  }

  /**
   * True when the submission's most recent post job completed successfully.
   * Used by the post queue to gate dependent submissions: a submission that
   * declares a `dependsOn` is only handed to the engine once every dependency
   * reports success here. Reads the durable persisted job (newest first), with
   * any in-flight job overlaid from memory so a just-finished run is reflected
   * immediately. Returns false when the submission has never been posted.
   */
  async hasSucceeded(submissionId: SubmissionId): Promise<boolean> {
    // Prefer the live job if one is tracked (most up-to-date state).
    const active = this.scheduler.getActiveJobForSubmission(submissionId);
    if (active) return active.computeStatus() === NodeStatus.SUCCEEDED;
    const jobs = await this.persistence.loadBySubmission(submissionId);
    if (jobs.length === 0) return false;
    const newest = jobs[0];
    const live = this.scheduler.getJob(newest.id);
    return (live ?? newest).computeStatus() === NodeStatus.SUCCEEDED;
  }

  /**
   * Drive the scheduler to idle, then run terminal handling. Serialized via
   * `runMutex`: if a drain is already in flight we flag a rerun rather than
   * queueing a second one. The in-flight drain re-checks the flag after each
   * pass and loops again if set, so a job enqueued in the tiny window between
   * the scheduler going idle and the mutex releasing is still picked up
   * promptly instead of waiting for the next cron tick.
   */
  private async drain(): Promise<void> {
    this.drainRerunRequested = true;
    if (this.runMutex.isLocked()) return; // a drain is already running
    const release = await this.runMutex.acquire();
    try {
      while (this.drainRerunRequested) {
        this.drainRerunRequested = false;
        await this.scheduler.runToIdle();
        await this.handleCompletions();
      }
    } catch (error) {
      this.logger.withError(error).error('Relay run failed');
    } finally {
      release();
    }
  }

  /** Archive/notify for jobs that have reached a terminal state. */
  private async handleCompletions(): Promise<void> {
    // After runToIdle every tracked job is terminal; reap each one exactly
    // once. The scheduler's live working set is the source of truth for what
    // just finished.
    for (const job of this.scheduler.getTrackedJobs()) {
      if (!isTerminal(job)) continue; // still running
      await this.onTerminal(job);
      this.deps.release(job.id);
      // Drop the finished job tree from the scheduler's live working set so a
      // long-running process doesn't retain every job ever posted. Persistent
      // history is served from the database (getHistory).
      this.scheduler.forget(job.id);
    }
  }

  private async onTerminal(job: RelayJob): Promise<void> {
    const status = job.computeStatus();
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

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
  }

  /** Resume any active (non-terminal) jobs left over from a crash/shutdown. */
  async recover(): Promise<void> {
    try {
      const active = await this.persistence.loadActive();
      if (active.length === 0) return;

      this.logger
        .withMetadata({ count: active.length })
        .info('Recovering interrupted Relay jobs');

      await this.websiteRegistry.waitForInitialization(60_000);

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
    this.drain().catch((error) =>
      this.logger.withError(error).error('Relay run failed'),
    );
    return job.id;
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
      this.outcomes.set(submissionId, computeJobStatus(job));
      // eslint-disable-next-line no-await-in-loop
      await this.onTerminal(job);
      this.deps.release(job.id);
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

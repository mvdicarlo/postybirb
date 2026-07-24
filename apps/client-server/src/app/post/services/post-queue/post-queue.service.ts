import {
    Injectable,
    InternalServerErrorException,
    Optional,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
    PostQueueRecord,
    PostQueueRecordRepository,
    SubmissionRepository,
} from '@postybirb/database';
import { EntityId, ScheduleType, SubmissionId } from '@postybirb/types';
import { IsTestEnvironment } from '@postybirb/utils/common';
import { Mutex } from 'async-mutex';
import { Cron as CronGenerator } from 'croner';
import { PostyBirbService } from '../../../common/service/postybirb-service';
import { SettingsService } from '../../../settings/settings.service';
import { SubmissionEventPublisher } from '../../../submission/submission-event.publisher';
import { WSGateway } from '../../../web-socket/web-socket-gateway';
import { RelayPostManager } from '../../engine/post-manager.service';

/**
 * Owns the persisted post queue. The post-queue table records *what* to post;
 * the {@link RelayPostManager} owns *running*. Each cycle starts a Relay job for
 * a queued submission, dequeues finished ones, and leaves running ones alone.
 *
 * @class PostQueueService
 */
@Injectable()
export class PostQueueService extends PostyBirbService<PostQueueRecordRepository> {
  private readonly queueModificationMutex = new Mutex();

  private readonly queueMutex = new Mutex();

  private initTime = Date.now();

  private readonly submissionRepository = new SubmissionRepository();

  constructor(
    private readonly settingsService: SettingsService,
    private readonly relayPostManager: RelayPostManager,
    @Optional() webSocket?: WSGateway,
    @Optional()
    private readonly submissionEventPublisher?: SubmissionEventPublisher,
  ) {
    super(new PostQueueRecordRepository(), webSocket);
  }

  public async isPaused(): Promise<boolean> {
    return (await this.settingsService.getDefaultSettings()).settings
      .queuePaused;
  }

  public async pause() {
    this.logger.info('Queue paused');
    const settings = await this.settingsService.getDefaultSettings();
    await this.settingsService.update(settings.id, {
      settings: { ...settings.settings, queuePaused: true },
    });
  }

  public async resume() {
    this.logger.info('Queue resumed');
    const settings = await this.settingsService.getDefaultSettings();
    await this.settingsService.update(settings.id, {
      settings: { ...settings.settings, queuePaused: false },
    });
  }

  public override async remove(id: EntityId): Promise<void> {
    await this.dequeue([id]);
  }

  /** Enqueue submissions for posting (creates a queue record per submission). */
  public async enqueue(submissionIds: SubmissionId[]) {
    if (!submissionIds.length) return;
    const release = await this.queueModificationMutex.acquire();
    this.logger.withMetadata({ submissionIds }).info('Enqueueing posts');
    const changedIds = new Set<SubmissionId>();

    try {
      for (const submissionId of submissionIds) {
        const submission =
          await this.submissionRepository.findById(submissionId);
        if (!submission) {
          this.logger
            .withMetadata({ submissionId })
            .warn('Submission not found, skipping enqueue');
          continue;
        }
        if (submission.isArchived) {
          this.logger
            .withMetadata({ submissionId })
            .info('Submission is archived, skipping enqueue');
          continue;
        }

        const existing = await this.repository.findOne({
          where: (queueRecord, { eq }) =>
            eq(queueRecord.submissionId, submissionId),
        });
        if (!existing) {
          await this.repository.insert({ submissionId });
          changedIds.add(submissionId);
        }
        // If existing, do nothing (first-in-wins).
      }
    } catch (error) {
      this.logger.withError(error).error('Failed to enqueue posts');
      throw new InternalServerErrorException((error as Error).message);
    } finally {
      release();
      this.submissionEventPublisher?.markChanged([...changedIds]);
      this.initTime -= 61_000; // ensure the next cycle processes promptly
    }
  }

  public async dequeue(submissionIds: SubmissionId[]) {
    const release = await this.queueModificationMutex.acquire();
    this.logger.withMetadata({ submissionIds }).info('Dequeueing posts');

    try {
      const records = await this.repository.find({
        where: (queueRecord, { inArray }) =>
          inArray(queueRecord.submissionId, submissionIds),
      });

      submissionIds.forEach((id) => {
        this.relayPostManager.cancel(id);
      });

      const result = await this.repository.deleteById(records.map((r) => r.id));
      if (result.changes > 0) {
        this.submissionEventPublisher?.markChanged(
          records.map((record) => record.submissionId),
        );
      }
      return result;
    } catch (error) {
      this.logger.withError(error).error('Failed to dequeue posts');
      throw new InternalServerErrorException((error as Error).message);
    } finally {
      release();
    }
  }

  /** CRON-based enqueueing of scheduled submissions. */
  @Cron(CronExpression.EVERY_30_SECONDS)
  public async checkForScheduledSubmissions() {
    if (IsTestEnvironment()) return;

    const entities = await this.submissionRepository.find({
      where: (submission, { eq, and }) =>
        and(eq(submission.isScheduled, true), eq(submission.isArchived, false)),
    });
    const now = Date.now();
    const sorted = entities
      .filter(
        (e) =>
          e.schedule.scheduledFor &&
          new Date(e.schedule.scheduledFor).getTime() <= now,
      )
      .sort(
        (a, b) =>
          new Date(a.schedule.scheduledFor as string).getTime() -
          new Date(b.schedule.scheduledFor as string).getTime(),
      );
    if (sorted.length === 0) return;

    await this.enqueue(sorted.map((s) => s.id));

    // Advance recurring schedules to their next run.
    const recurring = sorted.filter(
      (submission) =>
        submission.schedule.scheduleType === ScheduleType.RECURRING &&
        submission.schedule.cron,
    );
    const scheduleResults = await Promise.allSettled(
      recurring.map(async (submission) => {
        const next = CronGenerator(submission.schedule.cron as string)
          .nextRun()
          ?.toISOString();
        if (!next) {
          return false;
        }
        const schedule = { ...submission.schedule, scheduledFor: next };
        await this.submissionRepository.update(submission.id, { schedule });
        return true;
      }),
    );
    this.submissionEventPublisher?.markChanged(
      recurring.flatMap((submission, index) => {
        const result = scheduleResults[index];
        return result.status === 'fulfilled' && result.value
          ? [submission.id]
          : [];
      }),
    );
  }

  /** Per-second queue tick (after a startup grace period). */
  @Cron(CronExpression.EVERY_SECOND)
  public async run() {
    if (!(this.initTime + 60_000 <= Date.now())) return;
    if (IsTestEnvironment()) return;
    await this.execute();
  }

  /**
   * Run one queue cycle: start Relay jobs for queued submissions, dequeue any
   * that finished, and leave running ones alone. Public for testing.
   */
  public async execute(): Promise<void> {
    if (this.queueMutex.isLocked()) return;
    const release = await this.queueMutex.acquire();
    try {
      if (await this.isPaused()) return;

      const records = await this.repository.find({
        orderBy: (queueRecord, { asc }) => asc(queueRecord.createdAt),
        with: { submission: true },
      });

      // Submissions with a live queue record this cycle. A dependency that is
      // itself queued here has not finished (re)posting yet, so its dependents
      // must wait for it — this re-enforces a restored dependency chain rather
      // than letting a stale, pre-archive success satisfy the gate.
      const queuedIds = new Set<SubmissionId>(records.map((r) => r.submissionId));

      for (const record of records) {
        const { submissionId, submission } = record;

        if (submission?.isArchived) {
          this.relayPostManager.cancel(submissionId);
          await this.dequeue([submissionId]);
          queuedIds.delete(submissionId);
          continue;
        }

        // The current queue entry's post has produced a terminal result.
        //  `record.createdAt` scopes the check to this entry so an outcome
        // from an earlier post is not consumed by mistake.
        if (
          await this.relayPostManager.getOutcome(submissionId, record.createdAt)
        ) {
          await this.dequeue([submissionId]);
          queuedIds.delete(submissionId);
          continue;
        }

        if (!this.relayPostManager.isPosting(submissionId)) {
          // Gate on cross-submission dependencies: a submission that declares
          // `metadata.dependsOn` is held back until every dependency has a
          // successfully-completed post job and is no longer queued for a
          // re-post this cycle. This enforces user-specified posting order
          // (e.g. comic pages) without serializing the whole queue. Leave the
          // queue record in place so the submission is re-evaluated on the next
          // cycle once its dependencies finish.
          if (!(await this.areDependenciesSatisfied(submission, queuedIds))) {
            continue;
          }
          await this.relayPostManager.enqueue(submissionId);
        }
      }
    } catch (error) {
      this.logger.withMetadata({ error }).error('Failed to run queue');
      throw error;
    } finally {
      release();
    }
  }

  /**
   * True when every submission listed in `metadata.dependsOn` is ready. A
   * dependency is ready when it has a successfully-completed post job AND is
   * not itself queued for a (re)post this cycle. Submissions with no declared
   * dependencies are always satisfied.
   *
   * The "not currently queued" clause re-enforces a restored dependency chain:
   * when an archived chain is unarchived and re-posted, every member gets a new
   * queue record, so a dependency's *prior* (pre-archive) success no longer
   * satisfies the gate — the dependent waits for the dependency's fresh post to
   * finish (and leave the queue) first. A dependency that is not re-queued
   * still relies on its historical success, so posting a lone dependent whose
   * prerequisite already posted continues to work.
   *
   * A dependency that no longer exists can never be satisfied, so blocking on
   * it would leave the dependent stuck forever. Instead we self-heal: stale ids
   * are stripped from `metadata.dependsOn` and satisfaction is decided from the
   * remaining, still-existing dependencies. This guards against stale
   * references that slip past the normal deletion cleanup (races, imports,
   * manual edits).
   */
  private async areDependenciesSatisfied(
    submission: PostQueueRecord['submission'] | undefined,
    queuedIds: ReadonlySet<SubmissionId>,
  ): Promise<boolean> {
    const dependsOn = submission?.metadata?.dependsOn;
    if (!submission || !dependsOn || dependsOn.length === 0) return true;

    const staleIds: SubmissionId[] = [];
    let blocked = false;
    for (const dependencyId of dependsOn) {
      const dependency = await this.submissionRepository.findById(dependencyId);
      if (!dependency) {
        staleIds.push(dependencyId);
        continue;
      }

      // The dependency is being (re)posted this cycle: its fresh post has not
      // finished, so block until it leaves the queue via a successful post.
      // Without this a stale, pre-archive success would satisfy the gate and a
      // restored chain would lose its ordering.
      if (queuedIds.has(dependencyId)) {
        blocked = true;
        continue;
      }

      if (!(await this.relayPostManager.hasSucceeded(dependencyId))) {
        blocked = true;
      }
    }

    if (staleIds.length > 0) {
      await this.stripStaleDependencies(submission, staleIds);
    }

    return !blocked;
  }

  /**
   * Remove references to deleted dependency submissions from a submission's
   * `metadata.dependsOn`. Used by {@link areDependenciesSatisfied} to self-heal
   * a dependent that points at a submission which no longer exists, so it is no
   * longer blocked forever by an unsatisfiable dependency.
   */
  private async stripStaleDependencies(
    submission: NonNullable<PostQueueRecord['submission']>,
    staleIds: SubmissionId[],
  ): Promise<void> {
    this.logger
      .withMetadata({ submissionId: submission.id, staleIds })
      .warn('Stripping references to deleted dependency submissions');
    const remaining = (submission.metadata?.dependsOn ?? []).filter(
      (depId) => !staleIds.includes(depId),
    );
    await this.submissionRepository.update(submission.id, {
      metadata: { ...submission.metadata, dependsOn: remaining },
    });
    this.submissionEventPublisher?.markChanged(submission.id);
  }

  /** Peeks at the next item in the queue (oldest first). */
  public async peek(): Promise<PostQueueRecord | null> {
    return this.repository.findOne({
      orderBy: (queueRecord, { asc }) => asc(queueRecord.createdAt),
      with: { submission: true },
    });
  }
}

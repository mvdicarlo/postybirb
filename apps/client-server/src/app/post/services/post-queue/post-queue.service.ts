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

    try {
      for (const submissionId of submissionIds) {
        // eslint-disable-next-line no-await-in-loop
        const submission = await this.submissionRepository.findById(submissionId);
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

        // eslint-disable-next-line no-await-in-loop
        const existing = await this.repository.findOne({
          where: (queueRecord, { eq }) =>
            eq(queueRecord.submissionId, submissionId),
        });
        if (!existing) {
          // eslint-disable-next-line no-await-in-loop
          await this.repository.insert({ submissionId });
        }
        // If existing, do nothing (first-in-wins).
      }
    } catch (error) {
      this.logger.withError(error).error('Failed to enqueue posts');
      throw new InternalServerErrorException((error as Error).message);
    } finally {
      release();
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
        this.relayPostManager.acknowledge(id);
      });

      return await this.repository.deleteById(records.map((r) => r.id));
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
        and(
          eq(submission.isScheduled, true),
          eq(submission.isArchived, false),
        ),
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
    sorted
      .filter((s) => s.schedule.scheduleType === ScheduleType.RECURRING && s.schedule.cron)
      .forEach((s) => {
        const next = CronGenerator(s.schedule.cron as string)
          .nextRun()
          ?.toISOString();
        if (next) {
          // eslint-disable-next-line no-param-reassign
          s.schedule.scheduledFor = next;
          this.submissionRepository.update(s.id, { schedule: s.schedule });
        }
      });
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

      for (const record of records) {
        const { submissionId, submission } = record;

        if (submission?.isArchived) {
          this.relayPostManager.cancel(submissionId);
          this.relayPostManager.acknowledge(submissionId);
          // eslint-disable-next-line no-await-in-loop
          await this.dequeue([submissionId]);
          continue;
        }

        if (this.relayPostManager.getOutcome(submissionId)) {
          //  manager already handled archive/notify; clear the queue.Terminal 
          this.relayPostManager.acknowledge(submissionId);
          // eslint-disable-next-line no-await-in-loop
          await this.dequeue([submissionId]);
          continue;
        }

        if (!this.relayPostManager.isPosting(submissionId)) {
          // eslint-disable-next-line no-await-in-loop
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

  /** Peeks at the next item in the queue (oldest first). */
  public async peek(): Promise<PostQueueRecord | null> {
    return this.repository.findOne({
      orderBy: (queueRecord, { asc }) => asc(queueRecord.createdAt),
      with: { submission: true },
    });
  }
}

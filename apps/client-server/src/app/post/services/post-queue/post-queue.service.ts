import {
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  EntityId,
  PostRecordResumeMode,
  PostRecordState,
  ScheduleType,
  SubmissionId,
} from '@postybirb/types';
import { IsTestEnvironment } from '@postybirb/utils/electron';
import { Mutex } from 'async-mutex';
import { Cron as CronGenerator } from 'croner';
import { PostyBirbService } from '../../../common/service/postybirb-service';
import { PostQueueRecord, PostRecord } from '../../../drizzle/models';
import { PostyBirbDatabase } from '../../../drizzle/postybirb-database/postybirb-database';
import { NotificationsService } from '../../../notifications/notifications.service';
import { SettingsService } from '../../../settings/settings.service';
import { SubmissionService } from '../../../submission/services/submission.service';
import { WSGateway } from '../../../web-socket/web-socket-gateway';
import { PostManagerRegistry } from '../post-manager-v2';
import { PostRecordFactory } from '../post-record-factory';

/**
 * Handles the queue of posts to be posted.
 * This service is responsible for managing the queue of posts to be posted.
 * It will create post records and start the post manager when a post is ready to be posted.
 * @class PostQueueService
 */
@Injectable()
export class PostQueueService
  extends PostyBirbService<'PostQueueRecordSchema'>
  implements OnModuleInit
{
  private readonly queueModificationMutex = new Mutex();

  private readonly queueMutex = new Mutex();

  private readonly initTime = Date.now();

  private readonly postRecordRepository = new PostyBirbDatabase(
    'PostRecordSchema',
  );

  private readonly submissionRepository = new PostyBirbDatabase(
    'SubmissionSchema',
  );

  /**
   * Maximum time (in ms) a post can be RUNNING without any activity before being considered stuck.
   */
  private readonly maxPostIdleTime = 30 * 60 * 1000; // 30 minutes

  constructor(
    private readonly postManagerRegistry: PostManagerRegistry,
    private readonly postRecordFactory: PostRecordFactory,
    private readonly settingsService: SettingsService,
    private readonly notificationService: NotificationsService,
    private readonly submissionService: SubmissionService,
    @Optional() webSocket?: WSGateway,
  ) {
    super('PostQueueRecordSchema', webSocket);
  }

  /**
   * Crash recovery: Resume any PostRecords that were left in RUNNING state.
   * This handles cases where the application was forcefully shut down or crashed
   * while a post was in progress.
   */
  async onModuleInit() {
    if (IsTestEnvironment()) {
      return;
    }

    try {
      // Find all RUNNING post records
      const runningRecords = await this.postRecordRepository.find({
        where: (record, { eq }) => eq(record.state, PostRecordState.RUNNING),
        with: {
          submission: {
            with: {
              files: true,
              options: {
                with: {
                  account: true,
                },
              },
            },
          },
        },
      });

      if (runningRecords.length > 0) {
        this.logger
          .withMetadata({ count: runningRecords.length })
          .info(
            'Detected interrupted PostRecords from crash/shutdown, resuming',
          );

        for (const record of runningRecords) {
          this.logger
            .withMetadata({
              recordId: record.id,
              resumeMode: record.resumeMode,
            })
            .info('Resuming interrupted PostRecord');

          // Resume the post - the manager will build resume context
          // from the record's events that already completed
          await this.postManagerRegistry.startPost(record);
        }
      }
    } catch (error) {
      this.logger
        .withMetadata({ error })
        .error('Failed to recover interrupted posts on startup');
      // Don't throw - allow the app to start even if crash recovery fails
    }
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

  public override remove(id: EntityId) {
    return this.dequeue([id]);
  }

  /**
   * Get the most recent terminal PostRecord for a submission.
   * @param {SubmissionId} submissionId - The submission ID
   * @returns {Promise<PostRecord | null>} The most recent terminal record, or null if none
   */
  private async getMostRecentTerminalPostRecord(
    submissionId: SubmissionId,
  ): Promise<PostRecord | null> {
    const records = await this.postRecordRepository.find({
      where: (record, { eq, and, inArray }) =>
        and(
          eq(record.submissionId, submissionId),
          inArray(record.state, [PostRecordState.DONE, PostRecordState.FAILED]),
        ),
      orderBy: (record, { desc }) => desc(record.createdAt),
      limit: 1,
    });

    return records.length > 0 ? records[0] : null;
  }

  /**
   * Handle terminal state for a completed post record.
   * Archives the submission if successful and non-recurring.
   * Emits appropriate notifications.
   * @param {PostRecord} record - The completed post record
   */
  private async handleTerminalState(record: PostRecord): Promise<void> {
    const { submission } = record;
    const submissionName = submission.getSubmissionName() ?? 'Submission';

    if (record.state === PostRecordState.DONE) {
      this.logger
        .withMetadata({ submissionId: record.submissionId })
        .info('Post completed successfully');

      // Archive submission if non-recurring schedule
      if (submission.schedule.scheduleType !== ScheduleType.RECURRING) {
        await this.submissionService.archive(record.submissionId);
        this.logger
          .withMetadata({ submissionId: record.submissionId })
          .info('Submission archived after successful post');
      }

      // Emit success notification
      await this.notificationService.create({
        type: 'success',
        title: 'Post Completed',
        message: `Successfully posted "${submissionName}" to all websites`,
        tags: ['post-success'],
        data: {
          submissionId: record.submissionId,
          type: submission.type,
        },
      });
    } else if (record.state === PostRecordState.FAILED) {
      this.logger
        .withMetadata({ submissionId: record.submissionId })
        .error('Post failed');

      // Count failed events for the message
      const failedEventCount =
        record.events?.filter((e) => e.eventType === 'POST_ATTEMPT_FAILED')
          .length ?? 0;

      // Emit failure notification (summary - individual failures already notified)
      await this.notificationService.create({
        type: 'warning',
        title: 'Post Incomplete',
        message:
          failedEventCount > 0
            ? `"${submissionName}" failed to post to ${failedEventCount} website(s)`
            : `"${submissionName}" failed to post`,
        tags: ['post-incomplete'],
        data: {
          submissionId: record.submissionId,
          type: submission.type,
          failedCount: failedEventCount,
        },
      });
    }
  }

  /**
   * Enqueue submissions for posting.
   * If resumeMode is provided and the submission has a terminal PostRecord,
   * a new PostRecord will be created using the specified resume mode.
   *
   * Smart handling: If the most recent PostRecord is DONE (successful completion),
   * we always create a fresh record (restart) regardless of the provided resumeMode,
   * since the user is starting a new posting session.
   *
   * @param {SubmissionId[]} submissionIds - The submissions to enqueue
   * @param {PostRecordResumeMode} resumeMode - Optional resume mode for re-queuing terminal records
   */
  public async enqueue(
    submissionIds: SubmissionId[],
    resumeMode?: PostRecordResumeMode,
  ) {
    if (!submissionIds.length) {
      return;
    }
    const release = await this.queueModificationMutex.acquire();
    this.logger
      .withMetadata({ submissionIds, resumeMode })
      .info('Enqueueing posts');

    try {
      for (const submissionId of submissionIds) {
        const existing = await this.repository.findOne({
          where: (queueRecord, { eq }) =>
            eq(queueRecord.submissionId, submissionId),
          with: {
            postRecord: true,
          },
        });

        if (!existing) {
          // No queue entry exists - determine resume mode based on most recent PostRecord
          const mostRecentRecord =
            await this.getMostRecentTerminalPostRecord(submissionId);

          let effectiveResumeMode: PostRecordResumeMode;

          if (!mostRecentRecord) {
            // No prior post record - fresh start
            this.logger
              .withMetadata({ submissionId })
              .info('No prior PostRecord - creating fresh');
            effectiveResumeMode = PostRecordResumeMode.NEW;
          } else if (mostRecentRecord.state === PostRecordState.DONE) {
            // Prior was successful - always restart fresh regardless of provided mode
            this.logger
              .withMetadata({ submissionId })
              .info('Prior PostRecord was DONE - creating fresh (restart)');
            effectiveResumeMode = PostRecordResumeMode.NEW;
          } else {
            // Prior was FAILED - use provided mode or default to CONTINUE
            effectiveResumeMode = resumeMode ?? PostRecordResumeMode.CONTINUE;
            this.logger
              .withMetadata({
                submissionId,
                priorRecordId: mostRecentRecord.id,
                resumeMode: effectiveResumeMode,
              })
              .info('Prior PostRecord was FAILED - using resume mode');
          }

          const newRecord = await this.postRecordFactory.create(
            submissionId,
            effectiveResumeMode,
          );

          await this.repository.insert({
            submissionId,
            postRecordId: newRecord.id,
          });
        }
        // If existing, do nothing (first-in-wins)
      }
    } catch (error) {
      this.logger.withMetadata({ error }).error('Failed to enqueue posts');
      throw new InternalServerErrorException(error.message);
    } finally {
      release();
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

      submissionIds.forEach((id) =>
        this.postManagerRegistry.cancelIfRunning(id),
      );

      return await this.repository.deleteById(records.map((r) => r.id));
    } catch (error) {
      this.logger.withMetadata({ error }).error('Failed to dequeue posts');
      throw new InternalServerErrorException(error.message);
    } finally {
      release();
    }
  }

  /**
   * CRON based enqueueing of scheduled submissions.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  public async checkForScheduledSubmissions() {
    if (IsTestEnvironment()) {
      return;
    }

    const entities = await this.submissionRepository.find({
      where: (queueRecord, { eq }) => eq(queueRecord.isScheduled, true),
    });
    const now = Date.now();
    const sorted = entities
      .filter((e) => new Date(e.schedule.scheduledFor).getTime() <= now) // Only those that are ready to be posted.
      .sort(
        (a, b) =>
          new Date(a.schedule.scheduledFor).getTime() -
          new Date(b.schedule.scheduledFor).getTime(),
      ); // Sort by oldest first.
    await this.enqueue(sorted.map((s) => s.id));
    sorted
      .filter((s) => s.schedule.cron)
      .forEach((s) => {
        const next = CronGenerator(s.schedule.cron).nextRun()?.toISOString();
        if (next) {
          // eslint-disable-next-line no-param-reassign
          s.schedule.scheduledFor = next;
          this.submissionRepository.update(s.id, {
            schedule: s.schedule,
          });
        }
      });
  }

  /**
   * This runs a check every second on the state of queue items.
   * This aims to have simple logic. Each run will either create a post record and start the post manager,
   * or remove a submission from the queue if it is in a terminal state.
   * Nothing happens if the queue is empty.
   */
  @Cron(CronExpression.EVERY_SECOND)
  public async run() {
    if (!(this.initTime + 60_000 <= Date.now())) {
      // Only run after 1 minute to allow the application to start up.
      return;
    }

    if (IsTestEnvironment()) {
      return;
    }

    await this.execute();
  }

  /**
   * Check if a RUNNING post record appears to be stuck (no activity for too long).
   * Uses both record update time and last event time to determine activity.
   *
   * @param {PostRecord} record - The post record to check
   * @returns {boolean} True if the record appears to be stuck
   */
  private isStuck(record: PostRecord): boolean {
    if (record.state !== PostRecordState.RUNNING) {
      return false;
    }

    // Find the most recent activity: either record update or last event
    const recordUpdatedAt = new Date(record.updatedAt).getTime();
    const lastEventAt = record.events?.length
      ? Math.max(...record.events.map((e) => new Date(e.createdAt).getTime()))
      : 0;
    const lastActivityAt = Math.max(recordUpdatedAt, lastEventAt);
    const idleTime = Date.now() - lastActivityAt;

    return idleTime > this.maxPostIdleTime;
  }

  /**
   * Manages the queue by peeking at the top of the queue and deciding what to do based on the
   * state of the queue.
   *
   * Made public for testing purposes.
   */
  public async execute() {
    if (this.queueMutex.isLocked()) {
      return;
    }

    const release = await this.queueMutex.acquire();

    try {
      const isPaused = await this.isPaused();
      if (isPaused) {
        this.logger.info('Queue is paused, skipping execution cycle');
        return;
      }

      const top = await this.peek();
      // Queue Empty
      if (!top) {
        return;
      }

      const { postRecord: record, submissionId, submission } = top;
      if (submission.isArchived) {
        // Submission is archived, remove from queue
        this.logger
          .withMetadata({ submissionId })
          .info('Submission is archived, removing from queue');
        await this.dequeue([submissionId]);
        return;
      }

      if (!record) {
        // PostRecord should always exist since enqueue() creates it
        // If missing, something is wrong - log error and remove from queue
        this.logger
          .withMetadata({ submissionId })
          .error('Queue entry has no PostRecord - removing invalid entry');
        await this.dequeue([submissionId]);
        return;
      }

      if (
        record.state === PostRecordState.DONE ||
        record.state === PostRecordState.FAILED
      ) {
        // Post is in a terminal state - handle completion actions and remove from queue
        await this.handleTerminalState(record);
        await this.dequeue([submissionId]);
      } else if (!this.postManagerRegistry.isPostingType(submission.type)) {
        // Post is not in a terminal state, but the manager for this type is not posting, so restart it.
        this.logger
          .withMetadata({ record })
          .info(
            'PostManager is not posting, but record is not in terminal state. Resuming record.',
          );

        // Start the post - the manager will build resume context from the record
        await this.postManagerRegistry.startPost(record);
      } else if (this.isStuck(record)) {
        // Manager is posting but record shows no activity - it's stuck
        const recordUpdatedAt = new Date(record.updatedAt).getTime();
        const lastEventAt = record.events?.length
          ? Math.max(
              ...record.events.map((e) => new Date(e.createdAt).getTime()),
            )
          : 0;
        const lastActivityAt = Math.max(recordUpdatedAt, lastEventAt);

        this.logger
          .withMetadata({
            submissionId,
            recordId: record.id,
            idleTime: Date.now() - lastActivityAt,
            lastActivityAt: new Date(lastActivityAt).toISOString(),
            eventCount: record.events?.length ?? 0,
          })
          .warn(
            'PostRecord has been RUNNING without activity - marking as failed',
          );

        await this.postRecordRepository.update(record.id, {
          state: PostRecordState.FAILED,
          completedAt: new Date().toISOString(),
        });
        // Next cycle will handle terminal state
      }
      // else: manager is actively posting and making progress - do nothing
    } catch (error) {
      this.logger.withMetadata({ error }).error('Failed to run queue');
      throw error;
    } finally {
      release();
    }
  }

  /**
   * Peeks at the next item in the queue.
   * Based on the createdAt date.
   */
  public async peek(): Promise<PostQueueRecord | undefined> {
    return this.repository.findOne({
      orderBy: (queueRecord, { asc }) => asc(queueRecord.createdAt),
      with: {
        submission: true,
        postRecord: {
          with: {
            events: true,
            submission: {
              with: {
                files: true,
                options: {
                  with: {
                    account: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}

import {
  Injectable,
  InternalServerErrorException,
  Optional,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  EntityId,
  PostRecordResumeMode,
  PostRecordState,
  SubmissionId,
} from '@postybirb/types';
import { IsTestEnvironment } from '@postybirb/utils/electron';
import { Mutex } from 'async-mutex';
import { Cron as CronGenerator } from 'croner';
import { PostyBirbService } from '../../../common/service/postybirb-service';
import { PostQueueRecord, PostRecord } from '../../../drizzle/models';
import { PostyBirbDatabase } from '../../../drizzle/postybirb-database/postybirb-database';
import { SettingsService } from '../../../settings/settings.service';
import { WSGateway } from '../../../web-socket/web-socket-gateway';
import { PostManagerService } from '../post-manager/post-manager.service';

/**
 * Handles the queue of posts to be posted.
 * This service is responsible for managing the queue of posts to be posted.
 * It will create post records and start the post manager when a post is ready to be posted.
 * @class PostQueueService
 */
@Injectable()
export class PostQueueService extends PostyBirbService<'PostQueueRecordSchema'> {
  private readonly queueModificationMutex = new Mutex();

  private readonly queueMutex = new Mutex();

  private readonly initTime = Date.now();

  private readonly postRecordRepository = new PostyBirbDatabase(
    'PostRecordSchema',
  );

  private readonly submissionRepository = new PostyBirbDatabase(
    'SubmissionSchema',
  );

  constructor(
    private readonly postManager: PostManagerService,
    private readonly settingsService: SettingsService,
    @Optional() webSocket?: WSGateway,
  ) {
    super('PostQueueRecordSchema', webSocket);
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

  public async enqueue(submissionIds: SubmissionId[]) {
    if (!submissionIds.length) {
      return;
    }
    const release = await this.queueModificationMutex.acquire();
    this.logger.withMetadata({ submissionIds }).info('Enqueueing posts');

    try {
      for (const submissionId of submissionIds) {
        if (
          !(await this.repository.findOne({
            where: (queueRecord, { eq }) =>
              eq(queueRecord.submissionId, submissionId),
          }))
        ) {
          await this.repository.insert({
            submissionId,
          });
        }
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

      submissionIds.forEach((id) => this.postManager.cancelIfRunning(id));

      await this.repository.deleteById(records.map((r) => r.id));
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
    if (!(this.initTime + 15_000 <= Date.now())) {
      // Only run after 1 minute to allow the application to start up.
      return;
    }

    if (IsTestEnvironment()) {
      return;
    }

    await this.execute();
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
      const top = await this.peek();
      // Queue Empty
      if (!top) {
        return;
      }

      const isPaused = await this.isPaused();
      const { postRecord: record, submissionId } = top;
      if (!record) {
        // No record present, create one and start the post manager (if not paused)
        if (this.postManager.isPosting()) {
          // !NOTE - Not sure this could actually happen, but it's here just in case since it would be bad.
          this.logger.warn(
            'The post manager is already posting, but no record is present in the top of the queue',
          );
          return;
        }

        if (isPaused) {
          return;
        }
        const insertedRecord = await this.postRecordRepository.insert({
          submissionId,
          resumeMode: PostRecordResumeMode.CONTINUE,
          state: PostRecordState.PENDING,
        });
        await this.repository.update(top.id, {
          postRecordId: insertedRecord.id,
        });
        const fullyLoadedRecord = await this.repository.findOne({
          where: (r, { eq }) => eq(r.id, top.id),
          with: {
            postRecord: {
              with: {
                children: true,
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
        this.logger
          .withMetadata({ postRecord: insertedRecord.toObject() })
          .info('Creating PostRecord and starting PostManager');

        this.postManager.startPost(fullyLoadedRecord.postRecord);
      } else if (
        record.state === PostRecordState.DONE ||
        record.state === PostRecordState.FAILED
      ) {
        // Post is in a terminal state, remove from queue
        this.logger
          .withMetadata({ record })
          .info('Post is in a terminal state, removing from queue');
        await this.dequeue([submissionId]);
      } else if (!this.postManager.isPosting()) {
        // Post is not in a terminal state, but the post manager is not posting, so restart it.
        if (isPaused) {
          return;
        }
        this.logger
          .withMetadata({ record })
          .info(
            'PostManager is not posting, but record is not in terminal state. Resuming record.',
          );
        this.postManager.startPost(record as unknown as PostRecord);
      }
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
            children: true,
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

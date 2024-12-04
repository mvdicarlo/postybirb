import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from '@postybirb/logger';
import { PostRecordState, SubmissionId } from '@postybirb/types';
import { Mutex } from 'async-mutex';
import { PostQueueRecord, PostRecord } from '../../../database/entities';
import { PostyBirbRepository } from '../../../database/repositories/postybirb-repository';
import { PostManagerService } from '../post-manager/post-manager.service';

// TODOS:
// TODO - Remove post-manager's auto-check for the next post
// TODO - Remove post service's creation and queue handling logic.
// TODO - Better handling of 'loading' the post record
// TODO - Add other side of relationships to submission and post record entity objects.
@Injectable()
export class PostQueueService {
  private readonly logger = Logger();

  private readonly mutex = new Mutex();

  private readonly queueMutex = new Mutex();

  constructor(
    @InjectRepository(PostQueueRecord)
    private readonly queueRepository: EntityRepository<PostQueueRecord>,
    private readonly postManager: PostManagerService,
    private readonly postRecordRepository: PostyBirbRepository<PostRecord>,
  ) {}

  public async enqueue(submissionIds: SubmissionId[]) {
    const release = await this.mutex.acquire();
    this.logger.withMetadata({ submissionIds }).info('Enqueueing posts');

    try {
      for (const submissionId of submissionIds) {
        if (
          !(await this.queueRepository.findOne({ submission: submissionId }))
        ) {
          const record = this.queueRepository.create({
            submission: submissionId,
          });

          await this.queueRepository.persistAndFlush(record);
        }
      }
    } catch (error) {
      this.logger.withMetadata({ error }).error('Failed to enqueue posts');
      throw new InternalServerErrorException(error.message);
    } finally {
      release();
    }
  }

  private async dequeue(submissionIds: SubmissionId[]) {
    const release = await this.mutex.acquire();
    this.logger.withMetadata({ submissionIds }).info('Dequeueing posts');

    try {
      const records = await this.queueRepository.find({
        submission: { $in: submissionIds },
      });

      submissionIds.forEach(this.postManager.cancelIfRunning);

      await this.queueRepository.removeAndFlush(records);
    } catch (error) {
      this.logger.withMetadata({ error }).error('Failed to dequeue posts');
      throw new InternalServerErrorException(error.message);
    } finally {
      release();
    }
  }

  /**
   * This runs a check every second on the state of queue items.
   * This aims to have simple logic. Each run will either create a post record and start the post manager,
   * or remove a submission from the queue if it is in a terminal state.
   * Nothing happens if the queue is empty.
   */
  @Cron(CronExpression.EVERY_SECOND)
  private async run() {
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

      const { record, submission } = top;
      if (!record) {
        if (this.postManager.isPosting()) {
          this.logger.warn(
            'The post manager is already posting, but no record is present in the top of the queue',
          );
          return;
        }
        this.logger.info('Creating PostRecord and starting PostManager');
        const postRecord = null as any; // TODO - Create PostRecord
        this.postRecordRepository.persistAndFlush(postRecord);
        this.postManager.startPost(postRecord);
      } else if (
        record.state === PostRecordState.DONE ||
        record.state === PostRecordState.FAILED
      ) {
        // Post is in a terminal state, remove from queue
        await this.dequeue([submission.id]);
      } else if (!this.postManager.isPosting()) {
        // Post is not in a terminal state, but the post manager is not posting
        // Start the post manager
        this.logger
          .withMetadata({ record })
          .info(
            'PostManager is not posting, but record is not in terminal state. Resuming record.',
          );
        this.postManager.startPost(record as PostRecord);
      }
    } catch (error) {
      this.logger.withMetadata({ error }).error('Failed to run queue');
    } finally {
      release();
    }
  }

  /**
   * Peeks at the next item in the queue.
   * Based on the enqueuedAt date.
   */
  public async peek() {
    return this.queueRepository.findOne(
      {},
      { orderBy: { enqueuedAt: 'ASC' }, populate: ['record', 'submission'] },
    );
  }
}

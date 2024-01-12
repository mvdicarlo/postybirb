import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubmissionId } from '@postybirb/types';
import { uniq } from 'lodash';
import { PostyBirbService } from '../common/service/postybirb-service';
import { PostRecord, Submission } from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { IsTestEnvironment } from '../utils/test.util';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { WebsiteOptionsService } from '../website-options/website-options.service';
import { QueuePostRecordRequestDto } from './dtos/queue-post-record.dto';

/**
 * Handles enqueue and dequeue of post records.
 * @class PostService
 */
@Injectable()
export class PostService extends PostyBirbService<PostRecord> {
  constructor(
    @InjectRepository(PostRecord)
    repository: PostyBirbRepository<PostRecord>,
    @InjectRepository(Submission)
    private readonly submissionRepository: PostyBirbRepository<Submission>,
    private readonly submissionOptionsService: WebsiteOptionsService,
    @Optional() webSocket?: WSGateway
  ) {
    super(repository, webSocket);
  }

  /**
   * CRON run queue scheduled.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  private async run() {
    if (!IsTestEnvironment()) {
      const entities = await this.submissionRepository.find({
        isScheduled: true,
      });
      const now = Date.now();
      const sorted = entities
        .filter((e) => new Date(e.schedule.scheduledFor).getTime() <= now) // Only those that are ready to be posted.
        .sort(
          (a, b) =>
            new Date(a.schedule.scheduledFor).getTime() -
            new Date(b.schedule.scheduledFor).getTime()
        ); // Sort by oldest first.
      this.enqueue({ ids: sorted.map((s) => s.id) });
    }
  }

  /**
   * Enqueues a post record for posting in order.
   * @param {QueuePostRecordRequestDto} request
   * @return {*}  {Promise<string[]>}
   */
  async enqueue(request: QueuePostRecordRequestDto): Promise<string[]> {
    this.logger.debug(`Enqueueing ${request.ids} post records.`);
    const existing = await this.repository.find({
      parent: { $in: request.ids },
    });

    // Filter out any already queued that are not in a completed state.
    const unqueued = uniq(
      request.ids.filter(
        (id) => !existing.some((e) => e.parent.id === id && !e.completedAt)
      )
    );

    const created: SubmissionId[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const id of unqueued) {
      const submission = await this.submissionRepository.findOne(id);
      if (await this.verifyCanQueue(submission)) {
        const entity = this.repository.create({
          parent: this.submissionRepository.getReference(id),
          children: [], // Populate later when posting.
        });
        await this.repository.persistAndFlush(entity);
        created.push(entity.id);
      }
    }

    return created;
  }

  /**
   * Dequeues a post record from the queue.
   * @param {QueuePostRecordRequestDto} request
   * @return {*}  {Promise<void>}
   */
  async dequeue(request: QueuePostRecordRequestDto): Promise<void> {
    this.logger.debug(`Dequeueing ${request.ids} post records.`);
    const existing = await this.repository.find({
      parent: { $in: request.ids },
    });

    // Only remove those that are not marked as done as to protect the archived posts.
    const incomplete = existing.filter((e: PostRecord) => !!e.completedAt);
    await this.repository.removeAndFlush(incomplete);
  }

  /**
   * Does basic validation to ensure the submission can be queued safely.
   * @param {Submission} submission
   * @return {*}  {Promise<boolean>}
   */
  private async verifyCanQueue(submission: Submission): Promise<boolean> {
    if (!submission) {
      return false;
    }

    if (submission.options.length === 0) {
      return false;
    }

    const validations = await this.submissionOptionsService.validateSubmission(
      submission.id
    );
    if (validations.some((v) => v.errors.length > 0)) {
      return false;
    }

    return true;
  }
}

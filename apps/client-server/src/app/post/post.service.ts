import { InjectRepository } from '@mikro-orm/nestjs';
import { Inject, Injectable, Optional, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  PostRecordResumeMode,
  PostRecordState,
  SubmissionId,
} from '@postybirb/types';
import { Cron as CronGenerator } from 'croner';
import { uniq } from 'lodash';
import { PostyBirbService } from '../common/service/postybirb-service';
import { PostRecord, Submission } from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { IsTestEnvironment } from '../utils/test.util';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { WebsiteOptionsService } from '../website-options/website-options.service';
import { QueuePostRecordRequestDto } from './dtos/queue-post-record.dto';
import { PostManagerService } from './post-manager.service';

/**
 * Handles enqueue and dequeue of post records.
 * @class PostService
 */
@Injectable()
export class PostService extends PostyBirbService<PostRecord> {
  constructor(
    @Inject(forwardRef(() => PostManagerService))
    private readonly postManagerService: PostManagerService,
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

      sorted
        .filter((s) => s.schedule.cron)
        .forEach((s) => {
          const next = CronGenerator(s.schedule.cron).nextRun()?.toISOString();
          if (next) {
            // eslint-disable-next-line no-param-reassign
            s.schedule.scheduledFor = next;
            this.submissionRepository.persistAndFlush(s);
          }
        });
    }
  }

  /**
   * Enqueues a post record for posting in order.
   * @param {QueuePostRecordRequestDto} request
   * @return {*}  {Promise<string[]>}
   */
  async enqueue(request: QueuePostRecordRequestDto): Promise<string[]> {
    if (request.ids.length === 0) {
      return [];
    }
    this.logger.debug(`Enqueueing ${request.ids} post records.`);
    const existing = await this.repository.find({
      parent: { $in: request.ids },
    });

    // Filter out any already queued that are not in a completed state.
    // It may be better to move completed to a separate table to avoid this check.
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
        const postRecord = new PostRecord({
          parent: submission,
          resumeMode: PostRecordResumeMode.CONTINUE,
          state: PostRecordState.PENDING,
        });
        await this.repository.persistAndFlush(postRecord);
        created.push(postRecord.id);
      }
    }

    if (created.length > 0) {
      // Attempt to start the post manager if it is not already running.
      this.postManagerService.startPost(await this.getNext());
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

    // TODO - reconsider what happens to a cancelled post since it seems to have strange behavior.
    // Is it best to not remove it if it is already in a post state and just mark it as cancelled?

    // Only remove those that are not marked as done as to protect the archived posts.
    const incomplete = existing.filter(
      (e: PostRecord) => e.completedAt === undefined
    );

    request.ids.forEach((id) => this.postManagerService.cancelIfRunning(id));
    await Promise.all(incomplete.map((i) => this.remove(i.id)));
    await this.repository.flush();
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

  /**
   * Returns the next post record to be posted.
   * @return {*}  {Promise<PostRecord>}
   */
  async getNext(): Promise<PostRecord> {
    const entity = await this.repository.findOne(
      {
        completedAt: null,
      },
      {
        orderBy: { createdAt: 'ASC' },
        populate: [
          'parent',
          'parent.options',
          'parent.options.account',
          'children',
          'children.account',
        ],
      }
    );
    return entity;
  }
}

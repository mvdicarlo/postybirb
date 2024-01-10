import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Optional } from '@nestjs/common';
import { SubmissionId } from '@postybirb/types';
import { uniq } from 'lodash';
import { PostyBirbService } from '../common/service/postybirb-service';
import { PostRecord, Submission } from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { QueuePostRecordRequestDto } from './dtos/queue-post-record.dto';

@Injectable()
export class PostService extends PostyBirbService<PostRecord> {
  constructor(
    @InjectRepository(PostRecord)
    repository: PostyBirbRepository<PostRecord>,
    @InjectRepository(Submission)
    private readonly submissionRepository: PostyBirbRepository<Submission>,
    @Optional() webSocket?: WSGateway
  ) {
    super(repository, webSocket);
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

    const unqueued = uniq(
      request.ids.filter((id) => !existing.some((e) => e.parent.id === id))
    );

    const created: SubmissionId[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const id of unqueued) {
      const entity = this.repository.create({
        parent: this.submissionRepository.getReference(id),
        children: [], // Populate later when posting.
      });
      await this.repository.persistAndFlush(entity);
      created.push(entity.id);
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
    const existing = await this.repository.findOne({
      parent: { $in: request.ids },
    });
    await this.repository.removeAndFlush(existing);
  }
}

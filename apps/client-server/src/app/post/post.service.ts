import { Injectable, Optional } from '@nestjs/common';
import { EntityId, PostEventDto } from '@postybirb/types';
import { PostyBirbService } from '../common/service/postybirb-service';
import { PostyBirbDatabase } from '../drizzle/postybirb-database/postybirb-database';
import { WSGateway } from '../web-socket/web-socket-gateway';

/**
 * Simple entity service for post records.
 * @class PostService
 */
@Injectable()
export class PostService extends PostyBirbService<'PostRecordSchema'> {
  private readonly postEventRepository = new PostyBirbDatabase(
    'PostEventSchema',
  );

  constructor(@Optional() webSocket?: WSGateway) {
    super('PostRecordSchema', webSocket);
  }

  /**
   * Get all events for a specific post record.
   *
   * @param {EntityId} postRecordId - The post record ID
   * @returns {Promise<PostEventDto[]>} Array of post events
   */
  async getEvents(postRecordId: EntityId): Promise<PostEventDto[]> {
    const events = await this.postEventRepository.find({
      where: (event, { eq }) => eq(event.postRecordId, postRecordId),
      orderBy: (event, { asc }) => asc(event.createdAt),
      with: {
        account: true,
      },
    });

    return events.map((event) => event.toDTO());
  }
}

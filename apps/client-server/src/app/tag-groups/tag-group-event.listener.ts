import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@postybirb/logger';
import { TAG_GROUP_DELTA } from '@postybirb/socket-events';
import { EntityDelta, TagGroupDto } from '@postybirb/types';
import { WSGateway } from '../web-socket/web-socket-gateway';
import {
    TAG_GROUP_CREATED,
    TAG_GROUP_REMOVED,
    TAG_GROUP_UPDATED,
    TagGroupCreatedEvent,
    TagGroupRemovedEvent,
    TagGroupUpdatedEvent,
} from './tag-group.events';

@Injectable()
export class TagGroupEventListener {
  private readonly logger = Logger(TagGroupEventListener.name);

  constructor(private readonly webSocket: WSGateway) {}

  @OnEvent(TAG_GROUP_CREATED)
  handleCreated(event: TagGroupCreatedEvent): void {
    this.emit({ upserts: [event.entity], removedIds: [] });
  }

  @OnEvent(TAG_GROUP_UPDATED)
  handleUpdated(event: TagGroupUpdatedEvent): void {
    this.emit({ upserts: [event.entity], removedIds: [] });
  }

  @OnEvent(TAG_GROUP_REMOVED)
  handleRemoved(event: TagGroupRemovedEvent): void {
    this.emit({ upserts: [], removedIds: [event.id] });
  }

  private emit(data: EntityDelta<TagGroupDto>): void {
    try {
      this.webSocket.emit({ event: TAG_GROUP_DELTA, data });
    } catch (error) {
      this.logger.error('Error emitting tag group delta', error);
    }
  }
}
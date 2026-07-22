import { Injectable, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@postybirb/logger';
import { TAG_CONVERTER_DELTA } from '@postybirb/socket-events';
import { EntityDelta, TagConverterDto } from '@postybirb/types';
import { WSGateway } from '../web-socket/web-socket-gateway';
import {
    TAG_CONVERTER_CREATED,
    TAG_CONVERTER_REMOVED,
    TAG_CONVERTER_UPDATED,
    TagConverterCreatedEvent,
    TagConverterRemovedEvent,
    TagConverterUpdatedEvent,
} from './tag-converter.events';

@Injectable()
export class TagConverterEventListener {
  private readonly logger = Logger(TagConverterEventListener.name);

  constructor(@Optional() private readonly webSocket?: WSGateway) {}

  @OnEvent(TAG_CONVERTER_CREATED)
  handleCreated(event: TagConverterCreatedEvent): void {
    this.emit({ upserts: [event.entity], removedIds: [] });
  }

  @OnEvent(TAG_CONVERTER_UPDATED)
  handleUpdated(event: TagConverterUpdatedEvent): void {
    this.emit({ upserts: [event.entity], removedIds: [] });
  }

  @OnEvent(TAG_CONVERTER_REMOVED)
  handleRemoved(event: TagConverterRemovedEvent): void {
    this.emit({ upserts: [], removedIds: [event.id] });
  }

  private emit(data: EntityDelta<TagConverterDto>): void {
    try {
      this.webSocket?.emit({ event: TAG_CONVERTER_DELTA, data });
    } catch (error) {
      this.logger.error('Error emitting tag converter delta', error);
    }
  }
}
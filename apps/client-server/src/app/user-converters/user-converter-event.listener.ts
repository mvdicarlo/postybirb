import { Injectable, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@postybirb/logger';
import { USER_CONVERTER_DELTA } from '@postybirb/socket-events';
import { EntityDelta, UserConverterDto } from '@postybirb/types';
import { WSGateway } from '../web-socket/web-socket-gateway';
import {
    USER_CONVERTER_CREATED,
    USER_CONVERTER_REMOVED,
    USER_CONVERTER_UPDATED,
    UserConverterCreatedEvent,
    UserConverterRemovedEvent,
    UserConverterUpdatedEvent,
} from './user-converter.events';

@Injectable()
export class UserConverterEventListener {
  private readonly logger = Logger(UserConverterEventListener.name);

  constructor(@Optional() private readonly webSocket?: WSGateway) {}

  @OnEvent(USER_CONVERTER_CREATED)
  handleCreated(event: UserConverterCreatedEvent): void {
    this.emit({ upserts: [event.entity], removedIds: [] });
  }

  @OnEvent(USER_CONVERTER_UPDATED)
  handleUpdated(event: UserConverterUpdatedEvent): void {
    this.emit({ upserts: [event.entity], removedIds: [] });
  }

  @OnEvent(USER_CONVERTER_REMOVED)
  handleRemoved(event: UserConverterRemovedEvent): void {
    this.emit({ upserts: [], removedIds: [event.id] });
  }

  private emit(data: EntityDelta<UserConverterDto>): void {
    try {
      this.webSocket?.emit({ event: USER_CONVERTER_DELTA, data });
    } catch (error) {
      this.logger.error('Error emitting user converter delta', error);
    }
  }
}
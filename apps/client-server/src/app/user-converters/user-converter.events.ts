import { USER_CONVERTER_UPDATES } from '@postybirb/socket-events';
import { UserConverterDto } from '@postybirb/types';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export type UserConverterEventTypes = UserConverterUpdateEvent;

class UserConverterUpdateEvent implements WebsocketEvent<UserConverterDto[]> {
  event: string = USER_CONVERTER_UPDATES;

  data: UserConverterDto[];
}

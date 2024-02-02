import { ACCOUNT_UPDATES } from '@postybirb/socket-events';
import { IAccountDto } from '@postybirb/types';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export type AccountEventTypes = AccountUpdateEvent;

class AccountUpdateEvent implements WebsocketEvent<IAccountDto[]> {
  event: string = ACCOUNT_UPDATES;

  data: IAccountDto[];
}

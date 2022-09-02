import { ACCOUNT_UPDATES } from '@postybirb/socket-events';
import { SafeObject } from '@postybirb/types';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';
import { AccountDto } from './dtos/account.dto';

export type AccountEventTypes = AccountUpdateEvent;

class AccountUpdateEvent implements WebsocketEvent<AccountDto<SafeObject>[]> {
  event: string = ACCOUNT_UPDATES;

  data: AccountDto<SafeObject>[];
}

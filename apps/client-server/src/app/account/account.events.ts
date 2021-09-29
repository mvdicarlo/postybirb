import { AccountEvent } from '@postybirb/socket-events';
import { SafeObject } from '../shared/types/safe-object.type';
import { IEvent } from '../websocket/interfaces/event.interface';
import { AccountDto } from './dtos/account.dto';

export type AccountEventTypes = AccountUpdateEvent;

interface AccountUpdateEvent extends IEvent {
  event: AccountEvent.ACCOUNT_UPDATES;
  data: AccountDto<SafeObject>[];
}

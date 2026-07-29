import { EventEmitter2 } from '@nestjs/event-emitter';
import { ACCOUNT_DELTA } from '@postybirb/socket-events';
import { AccountId, IAccountDto } from '@postybirb/types';
import {
	EntityDeltaDescriptor,
	EntityDeltaEvent,
	getEntityCrudEventNames,
	publishEntityRemoved,
	publishEntityUpdated,
} from '../common/events/entity-crud.events';

export const ACCOUNT_EVENTS: EntityDeltaDescriptor = {
	prefix: 'account',
	delta: ACCOUNT_DELTA,
};

export const ACCOUNT_EVENT_PREFIX = ACCOUNT_EVENTS.prefix;

const ACCOUNT_EVENT_NAMES = getEntityCrudEventNames(ACCOUNT_EVENT_PREFIX);

export const ACCOUNT_STATE_CHANGED = ACCOUNT_EVENT_NAMES.updated;

export const ACCOUNT_REMOVED = ACCOUNT_EVENT_NAMES.removed;

export function publishAccountStateChanged(
	eventEmitter: EventEmitter2 | undefined,
	account: IAccountDto,
): void {
	publishEntityUpdated(eventEmitter, ACCOUNT_EVENT_PREFIX, account);
}

export function publishAccountRemoved(
	eventEmitter: EventEmitter2 | undefined,
	accountId: AccountId,
): void {
	publishEntityRemoved(eventEmitter, ACCOUNT_EVENT_PREFIX, accountId);
}

export type AccountEventTypes = EntityDeltaEvent<IAccountDto>;

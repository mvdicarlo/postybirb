/* eslint-disable max-classes-per-file */
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AccountId, IAccountDto } from '@postybirb/types';
import { EntityDeltaEvent } from '../common/events/entity-crud.events';

export const ACCOUNT_STATE_CHANGED = 'account.state-changed';

export const ACCOUNT_REMOVED = 'account.removed';

export class AccountStateChangedEvent {
	constructor(public readonly account: IAccountDto) {}
}

export function publishAccountStateChanged(
	eventEmitter: EventEmitter2 | undefined,
	account: IAccountDto,
): void {
	eventEmitter?.emit(ACCOUNT_STATE_CHANGED, [
		new AccountStateChangedEvent(account),
	]);
}

export class AccountRemovedEvent {
	constructor(public readonly accountId: AccountId) {}
}

export function publishAccountRemoved(
	eventEmitter: EventEmitter2 | undefined,
	accountId: AccountId,
): void {
	eventEmitter?.emit(ACCOUNT_REMOVED, [new AccountRemovedEvent(accountId)]);
}

export type AccountEventTypes = EntityDeltaEvent<IAccountDto>;

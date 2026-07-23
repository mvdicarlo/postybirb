import { EventEmitter2 } from '@nestjs/event-emitter';
import { AccountId } from '@postybirb/types';

export const WEBSITE_DATA_CHANGED = 'website-data.changed';

export class WebsiteDataChangedEvent {
  constructor(public readonly accountId: AccountId) {}
}

export function publishWebsiteDataChanged(
  eventEmitter: EventEmitter2 | undefined,
  accountIds: AccountId | AccountId[],
): void {
  const ids = Array.isArray(accountIds) ? accountIds : [accountIds];
  if (ids.length === 0) {
    return;
  }
  eventEmitter?.emit(
    WEBSITE_DATA_CHANGED,
    ids.map((accountId) => new WebsiteDataChangedEvent(accountId)),
  );
}
import { IAccountDto } from '@postybirb/types';
import { EntityDeltaEvent } from '../common/events/entity-crud.events';

export const ACCOUNT_EVENT_PREFIX = 'account';

export type AccountEventTypes = EntityDeltaEvent<IAccountDto>;

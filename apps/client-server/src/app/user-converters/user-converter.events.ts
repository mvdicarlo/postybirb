import { UserConverterDto } from '@postybirb/types';
import { EntityDeltaEvent } from '../common/events/entity-crud.events';

export const USER_CONVERTER_EVENT_PREFIX = 'user-converter';

export type UserConverterEventTypes = EntityDeltaEvent<UserConverterDto>;

import { SETTINGS_DELTA } from '@postybirb/socket-events';
import { SettingsDto } from '@postybirb/types';
import {
    EntityDeltaDescriptor,
    EntityDeltaEvent,
} from '../common/events/entity-crud.events';

export const SETTINGS_EVENTS: EntityDeltaDescriptor = {
  prefix: 'settings',
  delta: SETTINGS_DELTA,
};

export const SETTINGS_EVENT_PREFIX = SETTINGS_EVENTS.prefix;

export type SettingsEventTypes = EntityDeltaEvent<SettingsDto>;

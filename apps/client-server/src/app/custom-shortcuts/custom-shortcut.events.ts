import { CUSTOM_SHORTCUT_DELTA } from '@postybirb/socket-events';
import { ICustomShortcutDto } from '@postybirb/types';
import {
    EntityDeltaDescriptor,
    EntityDeltaEvent,
} from '../common/events/entity-crud.events';

export const CUSTOM_SHORTCUT_EVENTS: EntityDeltaDescriptor = {
  prefix: 'custom-shortcut',
  delta: CUSTOM_SHORTCUT_DELTA,
};

export const CUSTOM_SHORTCUT_EVENT_PREFIX = CUSTOM_SHORTCUT_EVENTS.prefix;

export type CustomShortcutEventTypes = EntityDeltaEvent<ICustomShortcutDto>;

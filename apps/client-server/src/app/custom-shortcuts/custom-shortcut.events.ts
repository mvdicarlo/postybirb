import { ICustomShortcutDto } from '@postybirb/types';
import { EntityDeltaEvent } from '../common/events/entity-crud.events';

export const CUSTOM_SHORTCUT_EVENT_PREFIX = 'custom-shortcut';

export type CustomShortcutEventTypes = EntityDeltaEvent<ICustomShortcutDto>;

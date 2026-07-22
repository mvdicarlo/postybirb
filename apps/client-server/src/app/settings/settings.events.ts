import { SettingsDto } from '@postybirb/types';
import { EntityDeltaEvent } from '../common/events/entity-crud.events';

export const SETTINGS_EVENT_PREFIX = 'settings';

export type SettingsEventTypes = EntityDeltaEvent<SettingsDto>;

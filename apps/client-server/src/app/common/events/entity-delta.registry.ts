import { ACCOUNT_EVENTS } from '../../account/account.events';
import { CUSTOM_SHORTCUT_EVENTS } from '../../custom-shortcuts/custom-shortcut.events';
import { DIRECTORY_WATCHER_EVENTS } from '../../directory-watchers/directory-watcher.events';
import { NOTIFICATION_EVENTS } from '../../notifications/notification.events';
import { SETTINGS_EVENTS } from '../../settings/settings.events';
import { TAG_CONVERTER_EVENTS } from '../../tag-converters/tag-converter.events';
import { TAG_GROUP_EVENTS } from '../../tag-groups/tag-group.events';
import { USER_CONVERTER_EVENTS } from '../../user-converters/user-converter.events';
import { EntityDeltaDescriptor } from './entity-crud.events';

/**
 * Central list of entities whose standard CRUD events (`<prefix>.created`,
 * `<prefix>.updated`, `<prefix>.removed`) are forwarded to the websocket as
 * entity deltas by {@link EntityDeltaBridge}.
 *
 * Add an entity here (paired with its `*_EVENTS` descriptor) to enable delta
 * broadcasting — no per-entity listener class is required. Entities with
 * bespoke projection logic (such as Submission) keep dedicated listeners.
 */
export const ENTITY_DELTA_DESCRIPTORS: EntityDeltaDescriptor[] = [
  ACCOUNT_EVENTS,
  TAG_GROUP_EVENTS,
  TAG_CONVERTER_EVENTS,
  USER_CONVERTER_EVENTS,
  CUSTOM_SHORTCUT_EVENTS,
  NOTIFICATION_EVENTS,
  SETTINGS_EVENTS,
  DIRECTORY_WATCHER_EVENTS,
];

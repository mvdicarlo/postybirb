import { AccountEventTypes } from '../account/account.events';
import { CustomShortcutEventTypes } from '../custom-shortcuts/custom-shortcut.events';
import { DirectoryWatcherEventTypes } from '../directory-watchers/directory-watcher.events';
import { NotificationEventTypes } from '../notifications/notification.events';
import { SettingsEventTypes } from '../settings/settings.events';
import { SubmissionEventTypes } from '../submission/submission.events';
import { TagConverterEventTypes } from '../tag-converters/tag-converter.events';
import { TagGroupEventTypes } from '../tag-groups/tag-group.events';
import { UpdateEventTypes } from '../update/update.events';
import { UserConverterEventTypes } from '../user-converters/user-converter.events';
import { WebsiteEventTypes } from '../websites/website.events';

export type WebSocketEvents =
  | AccountEventTypes
  | DirectoryWatcherEventTypes
  | SettingsEventTypes
  | SubmissionEventTypes
  | TagGroupEventTypes
  | TagConverterEventTypes
  | UpdateEventTypes
  | UserConverterEventTypes
  | WebsiteEventTypes
  | NotificationEventTypes
  | CustomShortcutEventTypes;

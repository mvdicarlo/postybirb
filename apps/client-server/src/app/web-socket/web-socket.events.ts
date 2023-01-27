import { AccountEventTypes } from '../account/account.events';
import { SettingsEventTypes } from '../settings/events/settings.events';
import { SubmissionEventTypes } from '../submission/submission.events';
import { TagGroupEventTypes } from '../tag-groups/tag-group.events';

export type WebSocketEvents =
  | AccountEventTypes
  | SettingsEventTypes
  | SubmissionEventTypes
  | TagGroupEventTypes;

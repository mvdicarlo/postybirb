import { AccountEventTypes } from '../account/account.events';
import { SettingsEventTypes } from '../settings/settings.events';
import { SubmissionEventTypes } from '../submission/submission.events';
import { TagConverterEventTypes } from '../tag-converters/tag-converter.events';
import { TagGroupEventTypes } from '../tag-groups/tag-group.events';
import { WebsiteEventTypes } from '../websites/website.events';

export type WebSocketEvents =
  | AccountEventTypes
  | SettingsEventTypes
  | SubmissionEventTypes
  | TagGroupEventTypes
  | TagConverterEventTypes
  | WebsiteEventTypes;

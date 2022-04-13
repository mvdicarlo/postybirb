import { AccountEventTypes } from '../account/account.events';
import { SettingsEventTypes } from '../settings/events/settings.events';

export type WebSocketEvents = AccountEventTypes | SettingsEventTypes;

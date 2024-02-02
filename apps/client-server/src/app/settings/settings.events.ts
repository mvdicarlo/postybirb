import { SETTINGS_UPDATES } from '@postybirb/socket-events';
import { Settings } from '../database/entities';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export type SettingsEventTypes = SettingsUpdateEvent;

class SettingsUpdateEvent implements WebsocketEvent<Settings[]> {
  event: string = SETTINGS_UPDATES;

  data: Settings[];
}

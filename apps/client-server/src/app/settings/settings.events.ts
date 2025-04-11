import { SETTINGS_UPDATES } from '@postybirb/socket-events';
import { SettingsDto } from '@postybirb/types';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export type SettingsEventTypes = SettingsUpdateEvent;

class SettingsUpdateEvent implements WebsocketEvent<SettingsDto[]> {
  event: string = SETTINGS_UPDATES;

  data: SettingsDto[];
}

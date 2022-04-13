import { SETTINGS_UPDATES } from '@postybirb/socket-events';
import { WebsocketEvent } from '../../web-socket/models/web-socket-event.model';
import { Settings } from '../entities/settings.entity';

export type SettingsEventTypes = SettingsUpdateEvent;

class SettingsUpdateEvent implements WebsocketEvent<Settings[]> {
  event: string = SETTINGS_UPDATES;

  data: Settings[];
}

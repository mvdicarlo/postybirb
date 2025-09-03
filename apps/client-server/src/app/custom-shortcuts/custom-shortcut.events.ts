import { CUSTOM_SHORTCUT_UPDATES } from '@postybirb/socket-events';
import { ICustomShortcut } from '@postybirb/types';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export type CustomShortcutEventTypes = CustomShortcutEvent;

class CustomShortcutEvent implements WebsocketEvent<ICustomShortcut[]> {
  event: string = CUSTOM_SHORTCUT_UPDATES;

  data: ICustomShortcut[];
}

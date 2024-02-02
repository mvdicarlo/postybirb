import { WEBSITE_UPDATES } from '@postybirb/socket-events';
import { IWebsiteInfoDto } from '@postybirb/types';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export type WebsiteEventTypes = WebsiteUpdateEvent;

class WebsiteUpdateEvent implements WebsocketEvent<IWebsiteInfoDto[]> {
  event: string = WEBSITE_UPDATES;

  data: IWebsiteInfoDto[];
}

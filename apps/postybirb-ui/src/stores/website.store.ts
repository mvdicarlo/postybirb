import { WEBSITE_UPDATES } from '@postybirb/socket-events';
import { IWebsiteInfoDto } from '@postybirb/types';
import websiteApi from '../api/websites.api';
import StoreManager from './store-manager';

export const WebsiteStore: StoreManager<IWebsiteInfoDto> =
  new StoreManager<IWebsiteInfoDto>(WEBSITE_UPDATES, () =>
    websiteApi.getWebsiteInfo().then(({ body }) => body),
  );

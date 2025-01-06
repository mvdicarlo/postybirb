import { Provider } from '@nestjs/common';
import { Class } from 'type-fest';
import { WEBSITE_IMPLEMENTATIONS } from '../../constants';
import { UnknownWebsite } from '../website';
import * as Websites from './index';
import TestWebsite from './test/test.website';

const websiteArray = Object.values(Websites);

// if (IsTestEnvironment()) {
(websiteArray as unknown as unknown[]).push(TestWebsite);
// }

export const WebsiteImplProvider: Provider<Class<UnknownWebsite>[]> = {
  provide: WEBSITE_IMPLEMENTATIONS,
  useValue: websiteArray as unknown as Class<UnknownWebsite>[],
};

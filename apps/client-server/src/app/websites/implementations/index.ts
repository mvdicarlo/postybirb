import { Provider } from '@nestjs/common';
import { Class } from 'type-fest';
import { WEBSITE_IMPLEMENTATIONS } from '../../constants';
import { UnknownWebsite } from '../website';
import Discord from './discord/discord.website';
import FurAffinity from './fur-affinity/fur-affinity.website';
import TestWebsite from './test/test.website';

const useValue: Class<UnknownWebsite>[] = [Discord, FurAffinity, TestWebsite];

// if (IsTestEnvironment()) {
useValue.push(TestWebsite);
// }

export const WebsiteImplProvider: Provider<Class<UnknownWebsite>[]> = {
  provide: WEBSITE_IMPLEMENTATIONS,
  useValue,
};

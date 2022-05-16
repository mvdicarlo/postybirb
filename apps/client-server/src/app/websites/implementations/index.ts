import { Provider } from '@nestjs/common';
import { Class } from 'type-fest';
import { WEBSITE_IMPLEMENTATIONS } from '../../constants';
import { UnknownWebsite } from '../website';
import FurAffinity from './fur-affinity/fur-affinity.website';
import TestWebsite from './test/test.website';

const useValue: Class<UnknownWebsite>[] = [TestWebsite, FurAffinity];

// if (process.env.NODE_ENV === 'Test') {
useValue.push(TestWebsite);
// }

export const websiteImplementationProvider: Provider<Class<UnknownWebsite>[]> =
  {
    provide: WEBSITE_IMPLEMENTATIONS,
    useValue,
  };

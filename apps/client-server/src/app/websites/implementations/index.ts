import { Provider } from '@nestjs/common';
import { WEBSITE_IMPLEMENTATIONS } from '../../constants';
import { UnknownWebsite } from '../website';
import TestWebsite from './test/test.website';
import { Class } from 'type-fest';

const useValue: Class<UnknownWebsite>[] = [TestWebsite];

if (process.env.NODE_ENV === 'Test') {
  useValue.push(TestWebsite);
}

export const websiteImplementationProvider: Provider<Class<UnknownWebsite>[]> =
  {
    provide: WEBSITE_IMPLEMENTATIONS,
    useValue,
  };

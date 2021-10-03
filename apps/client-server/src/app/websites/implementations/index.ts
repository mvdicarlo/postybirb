import { Provider } from '@nestjs/common';
import { WEBSITE_IMPLEMENTATIONS } from '../../constants';
import { Ctor } from '../../shared/interfaces/constructor.interface';
import { UnknownWebsite } from '../website';
import TestWebsite from './test/test.website';

const useValue: Ctor<UnknownWebsite>[] = [TestWebsite];

if (process.env.NODE_ENV === 'Test') {
  useValue.push(TestWebsite);
}

export const websiteImplementationProvider: Provider<Ctor<UnknownWebsite>[]> =
  {
    provide: WEBSITE_IMPLEMENTATIONS,
    useValue,
  };

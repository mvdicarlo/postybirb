import { TitleSupport } from '@postybirb/types';
import { Class } from 'type-fest';
import { UnknownWebsite } from '../website';
import { injectWebsiteDecoratorProps } from './website-decorator-props';

export function SupportsTitle(titleSupport: Partial<TitleSupport>) {
  return function website(constructor: Class<UnknownWebsite>) {
    injectWebsiteDecoratorProps(constructor, {
      titleSupport: {
        supportsTitle: true,
        truncateTitle: false,
        minTitleLength: -1,
        maxTitleLength: Infinity,
        ...titleSupport,
      },
    });
  };
}

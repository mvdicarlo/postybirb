import { DescriptionType } from '@postybirb/types';
import { Class } from 'type-fest';
import { UnknownWebsite } from '../website';
import { injectWebsiteDecoratorProps } from './website-decorator-props';

export function SupportsDescription(
  supportsDescriptionType: DescriptionType,
  maxDescriptionLength?: number,
  minDescriptionLength?: number
) {
  return function website(constructor: Class<UnknownWebsite>) {
    injectWebsiteDecoratorProps(constructor, {
      descriptionSupport: {
        supportsDescriptionType,
        maxDescriptionLength: maxDescriptionLength ?? Infinity,
        minDescriptionLength: minDescriptionLength ?? 0,
      },
    });
  };
}

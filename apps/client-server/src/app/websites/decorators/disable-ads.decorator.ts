import { Class } from 'type-fest';
import { UnknownWebsite } from '../website';
import { injectWebsiteDecoratorProps } from './website-decorator-props';

export function DisableAds() {
  return function website(constructor: Class<UnknownWebsite>) {
    injectWebsiteDecoratorProps(constructor, {
      allowAd: false,
    });
  };
}

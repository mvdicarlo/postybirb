import { injectWebsiteDecoratorProps } from './website-decorator-props';

export function DisableAds() {
  return function website(constructor) {
    injectWebsiteDecoratorProps(constructor, {
      allowAd: false,
    });
  };
}

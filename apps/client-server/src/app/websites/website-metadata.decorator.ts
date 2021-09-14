import { IWebsiteMetadata } from '@postybirb/website-metadata';

export function WebsiteMetadata(metadata: IWebsiteMetadata) {
  return function (constructor: Function) {
    constructor.prototype.metadata = metadata;
  };
}

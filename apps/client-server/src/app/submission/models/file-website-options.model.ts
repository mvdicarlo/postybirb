import BaseWebsiteOptions from './base-website-options.model';

export default interface FileWebsiteOptions extends BaseWebsiteOptions {
  useThumbnail: boolean;
  allowResize: boolean;
}

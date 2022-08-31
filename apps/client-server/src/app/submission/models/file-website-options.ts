import { BaseWebsiteOptions } from './base-website-options';

export default interface FileWebsiteOptions extends BaseWebsiteOptions {
  useThumbnail: boolean;
  allowResize: boolean;
}

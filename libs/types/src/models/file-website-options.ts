import { BaseWebsiteOptions } from './base-website-options';

export interface FileWebsiteOptions extends BaseWebsiteOptions {
  useThumbnail: boolean;
  allowResize: boolean;
}

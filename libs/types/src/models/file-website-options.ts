import { IBaseWebsiteOptions } from './base-website-options';

export interface FileWebsiteOptions extends IBaseWebsiteOptions {
  useThumbnail: boolean;
  allowResize: boolean;
}

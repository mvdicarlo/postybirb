import { BaseOptions } from './base-website-options';

export default interface FileWebsiteOptions extends BaseOptions {
  useThumbnail: boolean;
  allowResize: boolean;
}

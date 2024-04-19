/* eslint-disable no-param-reassign */
import { WebsiteFileOptions } from '@postybirb/types';
import { Class } from 'type-fest';
import { UnknownWebsite } from '../website';

export function SupportsFiles(websiteFileOptions: WebsiteFileOptions);
export function SupportsFiles(acceptedMimeTypes: string[]);
export function SupportsFiles(
  websiteFileOptionsOrMimeTypes: WebsiteFileOptions | string[]
) {
  return function website(constructor: Class<UnknownWebsite>) {
    let websiteFileOptions: WebsiteFileOptions = Array.isArray(
      websiteFileOptionsOrMimeTypes
    )
      ? { acceptedMimeTypes: websiteFileOptionsOrMimeTypes }
      : websiteFileOptionsOrMimeTypes;

    websiteFileOptions = {
      acceptedFileSizes: {},
      acceptedMimeTypes: [],
      acceptsExternalSourceUrls: false,
      fileBatchSize: 1,
      ...websiteFileOptions,
    };

    constructor.prototype.supportsFiles = websiteFileOptions;
  };
}

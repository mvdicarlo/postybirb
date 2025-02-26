import { ISubmissionFile, WebsiteFileOptions } from '@postybirb/types';
import {
  getFileType,
  getFileTypeFromMimeType,
} from '@postybirb/utils/file-type';
import { parse } from 'path';
import { Class } from 'type-fest';
import { UnknownWebsite } from '../website';
import { injectWebsiteDecoratorProps } from './website-decorator-props';

export function SupportsFiles(
  websiteFileOptions: Omit<WebsiteFileOptions, 'supportedFileTypes'>,
);
export function SupportsFiles(acceptedMimeTypes: string[]);
export function SupportsFiles(
  websiteFileOptionsOrMimeTypes:
    | Omit<WebsiteFileOptions, 'supportedFileTypes'>
    | string[],
) {
  return function website(constructor: Class<UnknownWebsite>) {
    let websiteFileOptions: WebsiteFileOptions = Array.isArray(
      websiteFileOptionsOrMimeTypes,
    )
      ? {
          acceptedMimeTypes: websiteFileOptionsOrMimeTypes,
          supportedFileTypes: [],
        }
      : { ...websiteFileOptionsOrMimeTypes, supportedFileTypes: [] };

    websiteFileOptions = {
      acceptedFileSizes: {},
      acceptedMimeTypes: [],
      acceptsExternalSourceUrls: false,
      fileBatchSize: 1,
      ...websiteFileOptions,
    };

    websiteFileOptions.acceptedMimeTypes.forEach((mimeType) => {
      const fileType = getFileTypeFromMimeType(mimeType);
      if (!websiteFileOptions.supportedFileTypes.includes(fileType)) {
        websiteFileOptions.supportedFileTypes.push(fileType);
      }
    });

    injectWebsiteDecoratorProps(constructor, {
      fileOptions: websiteFileOptions,
    });
  };
}

export function getSupportedFileSize(
  instance: UnknownWebsite,
  file: ISubmissionFile,
) {
  const acceptedFileSizes =
    instance.decoratedProps.fileOptions?.acceptedFileSizes;
  if (!acceptedFileSizes) {
    return undefined;
  }

  return (
    acceptedFileSizes[file.mimeType] ??
    acceptedFileSizes[`${file.mimeType.split('/')[0]}/*`] ??
    acceptedFileSizes[parse(file.fileName).ext] ??
    acceptedFileSizes[getFileType(file.fileName)] ??
    acceptedFileSizes['*'] ??
    Number.MAX_SAFE_INTEGER
  );
}

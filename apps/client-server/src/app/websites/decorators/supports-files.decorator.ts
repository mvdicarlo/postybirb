import { ISubmissionFile, WebsiteFileOptions } from '@postybirb/types';
import {
  getFileTypeFromFile,
  getFileTypeFromMimeType,
} from '@postybirb/utils/file-type';
import { parse } from 'path';
import { Class } from 'type-fest';
import { getDynamicFileSizeLimits } from '../models/website-modifiers/with-dynamic-file-size-limits';
import { UnknownWebsite } from '../website';
import { injectWebsiteDecoratorProps } from './website-decorator-props';

export function SupportsFiles(
  websiteFileOptions: Omit<WebsiteFileOptions, 'supportedFileTypes'>,
): (ctr: Class<UnknownWebsite>) => void;
export function SupportsFiles(
  acceptedMimeTypes: string[],
): (ctr: Class<UnknownWebsite>) => void;
export function SupportsFiles(
  websiteFileOptionsOrMimeTypes:
    | Omit<WebsiteFileOptions, 'supportedFileTypes'>
    | string[],
): (ctr: Class<UnknownWebsite>) => void {
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

export function isFileTypeSupported(
  instance: UnknownWebsite,
  file: Pick<ISubmissionFile, 'fileName' | 'mimeType'>,
): boolean {
  const supportedFileTypes =
    instance.decoratedProps.fileOptions?.supportedFileTypes ?? [];

  return (
    supportedFileTypes.length === 0 ||
    supportedFileTypes.includes(getFileTypeFromFile(file))
  );
}

export type FileFilterReason = 'ignored' | 'unsupported-file-type';

type FileFilterCandidate = Pick<ISubmissionFile, 'fileName' | 'mimeType'> & {
  metadata?: {
    ignoredWebsites?: readonly string[];
  };
};

export function getFileFilterReason(
  instance: UnknownWebsite,
  file: FileFilterCandidate,
  accountId: string = instance.accountId,
): FileFilterReason | undefined {
  if (file.metadata?.ignoredWebsites?.includes(accountId)) {
    return 'ignored';
  }

  if (!isFileTypeSupported(instance, file)) {
    return 'unsupported-file-type';
  }

  return undefined;
}

export function isFileSupported(
  instance: UnknownWebsite,
  file: FileFilterCandidate,
  accountId: string = instance.accountId,
): boolean {
  return getFileFilterReason(instance, file, accountId) === undefined;
}

export function getSupportedFileSize(
  instance: UnknownWebsite,
  file: ISubmissionFile,
) {
  const acceptedFileSizes =
    instance.decoratedProps.fileOptions?.acceptedFileSizes;

  const dynamicFileSizeLimits = getDynamicFileSizeLimits(instance);

  if (!acceptedFileSizes && !dynamicFileSizeLimits) {
    return undefined;
  }

  const limits = { ...acceptedFileSizes, ...dynamicFileSizeLimits };

  return (
    limits[file.mimeType] ??
    limits[`${file.mimeType.split('/')[0]}/*`] ??
    limits[parse(file.fileName).ext] ??
    limits[getFileTypeFromFile(file)] ??
    limits['*'] ??
    Number.MAX_SAFE_INTEGER
  );
}

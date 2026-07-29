import {
  FileSubmission,
  FileType,
  ISubmission,
  ISubmissionFile,
  SubmissionType,
} from '@postybirb/types';
import { getFileTypeFromFile } from '@postybirb/utils/file-type';
import { parse } from 'path';
import {
  getFileFilterReason,
  getSupportedFileSize,
  isFileSupported,
} from '../../websites/decorators/supports-files.decorator';
import DefaultWebsite from '../../websites/implementations/default/default.website';
import {
  ImplementedFileWebsite,
  isFileWebsite,
} from '../../websites/models/website-modifiers/file-website';
import { UnknownWebsite } from '../../websites/website';
import { ValidatorParams } from './validator.type';

function isFileHandlingWebsite(
  websiteInstance: UnknownWebsite,
): websiteInstance is ImplementedFileWebsite {
  return isFileWebsite(websiteInstance);
}

function isFileSubmission(
  submission: ISubmission,
): submission is FileSubmission {
  return submission.type === SubmissionType.FILE;
}

async function validateTextFileRequiresFallback({
  websiteInstance,
  submission,
  file,
  fileService,
  validator,
}: ValidatorParams & { file: ISubmissionFile }) {
  if (
    !isFileHandlingWebsite(websiteInstance) ||
    !isFileSubmission(submission) ||
    websiteInstance instanceof DefaultWebsite
  ) {
    return;
  }

  if (getFileTypeFromFile(file) !== FileType.TEXT) {
    return;
  }

  const supportedMimeTypes =
    websiteInstance.decoratedProps.fileOptions?.acceptedMimeTypes ?? [];
  if (supportedMimeTypes.length === 0) {
    return;
  }

  let altFileHasContent = false;
  if (file.altFileId) {
    const altFileSize = await fileService.getAltFileSize(file.altFileId);
    altFileHasContent = altFileSize > 0;
  }

  if (!supportedMimeTypes.includes(file.mimeType) && !altFileHasContent) {
    validator.error(
      'validation.file.text-file-no-fallback',
      {
        fileName: file.fileName,
        fileExtension: parse(file.fileName).ext,
        fileId: file.id,
      },
      'files',
    );
  }
}

export async function validateNotAllFilesIgnored({
  websiteInstance,
  submission,
  validator,
}: ValidatorParams) {
  if (
    !isFileHandlingWebsite(websiteInstance) ||
    !isFileSubmission(submission) ||
    websiteInstance instanceof DefaultWebsite
  ) {
    return;
  }

  const numFiles = submission.files.filter(
    (file) =>
      getFileFilterReason(websiteInstance, file) !== 'ignored',
  ).length;
  if (numFiles === 0) {
    validator.warning('validation.file.all-ignored', {}, 'files');
  }
}

export async function validateAcceptedFiles({
  result,
  websiteInstance,
  submission,
  data,
  fileConverterService,
  validator,
  ...rest
}: ValidatorParams) {
  if (
    !isFileHandlingWebsite(websiteInstance) ||
    !isFileSubmission(submission) ||
    websiteInstance instanceof DefaultWebsite
  ) {
    return;
  }

  const acceptedMimeTypes =
    websiteInstance.decoratedProps.fileOptions?.acceptedMimeTypes ?? [];
  const supportedFileTypes =
    websiteInstance.decoratedProps.fileOptions?.supportedFileTypes ?? [];

  if (!acceptedMimeTypes.length && !supportedFileTypes.length) {
    return;
  }

  for (const file of submission.files) {
    const filterReason = getFileFilterReason(websiteInstance, file);
    if (filterReason === 'ignored') {
      continue;
    }

    if (filterReason === 'unsupported-file-type') {
      validator.warning(
        'validation.file.unsupported-file-type',
        {
          fileName: file.fileName,
          fileType: getFileTypeFromFile(file),
          fileId: file.id,
        },
        'files',
      );
      continue;
    }

    if (!acceptedMimeTypes.includes(file.mimeType)) {
      const fileType = getFileTypeFromFile(file);

      if (fileType === FileType.TEXT) {
        await validateTextFileRequiresFallback({
          result,
          websiteInstance,
          submission,
          file,
          data,
          fileConverterService,
          validator,
          ...rest,
        });
        continue;
      }

      if (!fileConverterService.canConvert(file.mimeType, acceptedMimeTypes)) {
        validator.error(
          'validation.file.invalid-mime-type',
          {
            mimeType: file.mimeType,
            acceptedMimeTypes,
            fileId: file.id,
          },
          'files',
        );
      }
    }
  }
}

export async function validateFileBatchSize({
  websiteInstance,
  submission,
  validator,
}: ValidatorParams) {
  if (
    !isFileHandlingWebsite(websiteInstance) ||
    !isFileSubmission(submission) ||
    websiteInstance instanceof DefaultWebsite
  ) {
    return;
  }

  const maxBatchSize =
    websiteInstance.decoratedProps.fileOptions?.fileBatchSize ?? 0;
  const numFiles = submission.files.filter(
    (file) => isFileSupported(websiteInstance, file),
  ).length;
  if (numFiles > maxBatchSize) {
    const expectedBatchesToCreate = Math.ceil(numFiles / maxBatchSize);

    validator.warning(
      'validation.file.file-batch-size',
      {
        maxBatchSize,
        expectedBatchesToCreate,
      },
      'files',
    );
  }
}

export async function validateFileSize({
  websiteInstance,
  submission,
  validator,
}: ValidatorParams) {
  if (
    !isFileHandlingWebsite(websiteInstance) ||
    !isFileSubmission(submission) ||
    websiteInstance instanceof DefaultWebsite
  ) {
    return;
  }

  submission.files.forEach((file) => {
    if (!isFileSupported(websiteInstance, file)) {
      return;
    }

    const maxFileSize = getSupportedFileSize(websiteInstance, file);
    if (maxFileSize && file.size > maxFileSize) {
      const type =
        getFileTypeFromFile(file) === FileType.IMAGE ? 'warning' : 'error';

      validator[type](
        'validation.file.file-size',
        {
          maxFileSize,
          fileSize: file.size,
          fileName: file.fileName,
          fileId: file.id,
        },
        'files',
      );
    }
  });
}

export async function validateImageFileDimensions({
  result,
  websiteInstance,
  submission,
  validator,
}: ValidatorParams) {
  if (
    !isFileHandlingWebsite(websiteInstance) ||
    !isFileSubmission(submission) ||
    websiteInstance instanceof DefaultWebsite
  ) {
    return;
  }

  submission.files.forEach((file) => {
    if (!isFileSupported(websiteInstance, file)) {
      return;
    }
    if (getFileTypeFromFile(file) === FileType.IMAGE) {
      const resizeProps = websiteInstance.calculateImageResize(file);
      if (resizeProps) {
        validator.warning(
          'validation.file.image-resize',
          {
            fileName: file.fileName,
            resizeProps,
            fileId: file.id,
          },
          'files',
        );
      }
    }
  });
}

export async function validateFileAltTextLength({
  validator,
  websiteInstance,
  submission,
}: ValidatorParams) {
  if (!websiteInstance.decoratedProps.fileOptions) return;

  const { maxAltTextLength } = websiteInstance.decoratedProps.fileOptions;

  if (
    !isFileHandlingWebsite(websiteInstance) ||
    !isFileSubmission(submission) ||
    websiteInstance instanceof DefaultWebsite ||
    !maxAltTextLength
  ) {
    return;
  }

  submission.files.forEach((file) => {
    if (!file.metadata.altText || !isFileSupported(websiteInstance, file)) {
      return;
    }

    if (file.metadata.altText.length >= maxAltTextLength) {
      validator.warning('validation.file.alt-text.max-length', {
        currentLength: file.metadata.altText.length,
        maxLength: maxAltTextLength,
        fileId: file.id,
        fileName: file.fileName,
      });
    }
  });
}

import {
  FileSubmission,
  FileType,
  ISubmission,
  ISubmissionFile,
  SubmissionType,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { parse } from 'path';
import { getSupportedFileSize } from '../../websites/decorators/supports-files.decorator';
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

function isFileFiltered(
  file: ISubmissionFile,
  submission: FileSubmission,
  websiteInstance: UnknownWebsite,
): boolean {
  if (file.metadata?.ignoredWebsites?.includes(websiteInstance.accountId)) {
    return true;
  }
  return false;
}

async function validateTextFileRequiresFallback({
  websiteInstance,
  submission,
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

  for (const file of submission.files) {
    if (isFileFiltered(file, submission, websiteInstance)) {
      continue;
    }
    if (getFileType(file.fileName) === FileType.TEXT) {
      const supportedMimeTypes =
        websiteInstance.decoratedProps.fileOptions?.acceptedMimeTypes ?? [];
      if (supportedMimeTypes.length === 0) {
        // Assume empty to accept all file types if no accepted mime types are specified
        continue;
      }
      // Check if the alt file has content by querying its size
      let altFileHasContent = false;
      if (file.altFileId) {
        const altFileSize = await fileService.getAltFileSize(file.altFileId);
        altFileHasContent = altFileSize > 0;
      }
      // Fail validation if the file is not supported and alt file is empty or missing
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
    (file) => !isFileFiltered(file, submission, websiteInstance),
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

  submission.files.forEach((file) => {
    if (isFileFiltered(file, submission, websiteInstance)) {
      return;
    }
    if (!acceptedMimeTypes.includes(file.mimeType)) {
      const fileType = getFileType(file.fileName);
      if (!supportedFileTypes.includes(fileType)) {
        validator.error(
          'validation.file.unsupported-file-type',
          {
            fileName: file.fileName,
            fileType: getFileType(file.fileName),
            fileId: file.id,
          },
          'files',
        );
      }

      if (fileType === FileType.TEXT) {
        validateTextFileRequiresFallback({
          result,
          websiteInstance,
          submission,
          file,
          data,
          fileConverterService,
          validator,
          ...rest,
        });
        return;
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
  });
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
    (file) => !isFileFiltered(file, submission, websiteInstance),
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
    if (isFileFiltered(file, submission, websiteInstance)) {
      return;
    }

    const maxFileSize = getSupportedFileSize(websiteInstance, file);
    if (maxFileSize && file.size > maxFileSize) {
      const type =
        getFileType(file.fileName) === FileType.IMAGE ? 'warning' : 'error';

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
    if (isFileFiltered(file, submission, websiteInstance)) {
      return;
    }
    if (getFileType(file.fileName) === FileType.IMAGE) {
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
    if (
      !file.metadata.altText ||
      isFileFiltered(file, submission, websiteInstance)
    ) {
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

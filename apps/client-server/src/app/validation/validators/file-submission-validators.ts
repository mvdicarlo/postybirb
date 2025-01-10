import {
  FileSubmission,
  FileType,
  ISubmission,
  ISubmissionFile,
  SubmissionType,
  ValidationMessage,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { parse } from 'path';
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
  const { metadata } = submission;
  if (
    metadata?.fileMetadata[file.id]?.ignoredWebsites.includes(
      websiteInstance.accountId,
    )
  ) {
    return true;
  }
  return false;
}

function validateTextFileRequiresFallback({
  result,
  websiteInstance,
  submission,
}: ValidatorParams & { file: ISubmissionFile }) {
  if (
    !isFileHandlingWebsite(websiteInstance) ||
    !isFileSubmission(submission)
  ) {
    return;
  }

  submission.files.getItems().forEach((file) => {
    if (isFileFiltered(file, submission, websiteInstance)) {
      return;
    }
    if (getFileType(file.fileName) === FileType.TEXT) {
      const supportedMimeTypes =
        websiteInstance.decoratedProps.fileOptions?.acceptedMimeTypes ?? [];
      // Fail validation if the file is not supported and no alt file is provided
      if (!supportedMimeTypes.includes(file.mimeType) && !file.hasAltFile) {
        result.errors.push({
          id: 'validation.file.text-file-no-fallback',
          field: 'files',
          values: {
            fileName: file.fileName,
            fileExtension: parse(file.fileName).ext,
            fileId: file.id,
          },
        });
      }
    }
  });
}

export async function validateAcceptedFiles({
  result,
  websiteInstance,
  submission,
  data,
  fileConverterService,
  ...rest
}: ValidatorParams) {
  if (
    !isFileHandlingWebsite(websiteInstance) ||
    !isFileSubmission(submission)
  ) {
    return;
  }

  const acceptedMimeTypes =
    websiteInstance.decoratedProps.fileOptions?.acceptedMimeTypes ?? [];
  const supportedFileTypes =
    websiteInstance.decoratedProps.fileOptions?.supportedFileTypes ?? [];

  submission.files.getItems().forEach((file) => {
    if (isFileFiltered(file, submission, websiteInstance)) {
      return;
    }
    if (!acceptedMimeTypes.includes(file.mimeType)) {
      const fileType = getFileType(file.fileName);
      if (!supportedFileTypes.includes(fileType)) {
        result.errors.push({
          id: 'validation.file.unsupported-file-type',
          field: 'files',
          values: {
            fileName: file.fileName,
            fileType: getFileType(file.fileName),
            fileId: file.id,
          },
        });
      }

      if (fileType === FileType.TEXT) {
        validateTextFileRequiresFallback({
          result,
          websiteInstance,
          submission,
          file,
          data,
          fileConverterService,
          ...rest,
        });
        return;
      }

      if (!fileConverterService.canConvert(file.mimeType, acceptedMimeTypes)) {
        result.errors.push({
          id: 'validation.file.invalid-mime-type',
          field: 'files',
          values: {
            mimeType: file.mimeType,
            acceptedMimeTypes,
            fileId: file.id,
          },
        });
      }
    }
  });
}

export async function validateFileBatchSize({
  result,
  websiteInstance,
  submission,
}: ValidatorParams) {
  if (
    !isFileHandlingWebsite(websiteInstance) ||
    !isFileSubmission(submission)
  ) {
    return;
  }

  const maxBatchSize =
    websiteInstance.decoratedProps.fileOptions?.fileBatchSize ?? 0;
  const numFiles = submission.files
    .getItems()
    .filter(
      (file) => !isFileFiltered(file, submission, websiteInstance),
    ).length;
  if (numFiles > maxBatchSize) {
    const expectedBatchesToCreate = Math.ceil(numFiles / maxBatchSize);
    result.warnings.push({
      id: 'validation.file.file-batch-size',
      field: 'files',
      values: {
        maxBatchSize,
        expectedBatchesToCreate,
      },
    });
  }
}

export async function validateFileSize({
  result,
  websiteInstance,
  submission,
}: ValidatorParams) {
  if (
    !isFileHandlingWebsite(websiteInstance) ||
    !isFileSubmission(submission)
  ) {
    return;
  }

  const acceptedFileSizes =
    websiteInstance.decoratedProps.fileOptions?.acceptedFileSizes ?? {};

  submission.files.getItems().forEach((file) => {
    if (isFileFiltered(file, submission, websiteInstance)) {
      return;
    }
    const maxFileSize =
      acceptedFileSizes[file.mimeType] ??
      acceptedFileSizes[parse(file.fileName).ext] ??
      acceptedFileSizes[`${getFileType(file.fileName).toLowerCase()}/*`] ??
      acceptedFileSizes['*'];

    if (maxFileSize && file.size > maxFileSize * 1024 * 1024) {
      const issue: ValidationMessage = {
        id: 'validation.file.file-size',
        field: 'files',
        values: {
          maxFileSize,
          fileSize: 0,
          fileName: file.fileName,
          fileId: file.id,
        },
      };
      if (getFileType(file.fileName) === FileType.IMAGE) {
        result.warnings.push(issue);
      } else {
        result.errors.push(issue);
      }
    }
  });
}

export async function validateImageFileDimensions({
  result,
  websiteInstance,
  submission,
}: ValidatorParams) {
  if (
    !isFileHandlingWebsite(websiteInstance) ||
    !isFileSubmission(submission)
  ) {
    return;
  }

  submission.files.getItems().forEach((file) => {
    if (isFileFiltered(file, submission, websiteInstance)) {
      return;
    }
    if (getFileType(file.fileName) === FileType.IMAGE) {
      const resizeProps = websiteInstance.calculateImageResize(file);
      if (resizeProps) {
        result.warnings.push({
          id: 'validation.file.image-resize',
          field: 'files',
          values: {
            fileName: file.fileName,
            resizeProps,
            fileId: file.id,
          },
        });
      }
    }
  });
}

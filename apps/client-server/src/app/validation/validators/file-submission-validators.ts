import {
  FileType,
  ISubmission,
  SubmissionType,
  ValidationMessage,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { parse } from 'path';
import {
  FileWebsite,
  isFileWebsite,
} from '../../websites/models/website-modifiers/file-website';
import { UnknownWebsite } from '../../websites/website';
import { ValidatorParams } from './validator.type';

function canProcessFiles(
  submission: ISubmission,
  websiteInstance: UnknownWebsite,
) {
  return (
    isFileWebsite(websiteInstance) && submission.type === SubmissionType.FILE
  );
}

export async function validateAcceptedFiles({
  result,
  websiteInstance,
  submission,
}: ValidatorParams) {
  if (!canProcessFiles(submission, websiteInstance)) {
    return;
  }

  const acceptedMimeTypes =
    websiteInstance.decoratedProps.fileOptions?.acceptedMimeTypes ?? [];

  submission.files.getItems().forEach((file) => {
    if (
      !acceptedMimeTypes.includes(file.mimeType) ||
      acceptedMimeTypes.includes(parse(file.fileName).ext)
    ) {
      result.errors.push({
        id: 'validation.file.invalid-mime-type',
        field: 'files',
        values: {
          mimeType: file.mimeType,
          acceptedMimeTypes,
        },
      });
    }
  });
}

export async function validateFileBatchSize({
  result,
  websiteInstance,
  submission,
}: ValidatorParams) {
  if (!canProcessFiles(submission, websiteInstance)) {
    return;
  }

  const maxBatchSize =
    websiteInstance.decoratedProps.fileOptions?.fileBatchSize ?? 0;
  const numFiles = submission.files.getItems().length;
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
    submission.type !== SubmissionType.FILE ||
    !isFileWebsite(websiteInstance)
  ) {
    return;
  }

  const acceptedFileSizes =
    websiteInstance.decoratedProps.fileOptions?.acceptedFileSizes ?? {};

  submission.files.getItems().forEach((file) => {
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
  if (!canProcessFiles(submission, websiteInstance)) {
    return;
  }

  submission.files.getItems().forEach((file) => {
    if (getFileType(file.fileName) === FileType.IMAGE) {
      const resizeProps = (
        websiteInstance as unknown as FileWebsite<never>
      ).calculateImageResize(file);
      if (resizeProps) {
        result.warnings.push({
          id: 'validation.file.image-resize',
          field: 'files',
          values: {
            fileName: file.fileName,
            resizeProps,
          },
        });
      }
    }
  });
}

export async function validateTextFileRequiresFallback({
  result,
  websiteInstance,
  submission,
}: ValidatorParams) {
  if (!canProcessFiles(submission, websiteInstance)) {
    return;
  }

  // TODO - figure out a way to know when this needs to be active. Need a well known list of supported mime types to intersect with well known text types.
  // TODO - Use this to filter out the invalid mime types validation when this resolves to being allowed.
  // Idea: Stick the accepted file types in the uploader into the file type lib.
  submission.files.getItems().forEach((file) => {
    if (getFileType(file.fileName) === FileType.TEXT) {
      const supportedMimeTypes =
        websiteInstance.decoratedProps.fileOptions?.acceptedMimeTypes ?? [];
      const fileExtension = parse(file.fileName).ext;
      // Fail validation if the file is not supported and no alt file is provided
      // This checks both the extension and the mime type.
      if (
        (!supportedMimeTypes.includes(file.mimeType) ||
          !supportedMimeTypes.includes(fileExtension)) &&
        !file.hasAltFile
      ) {
        result.errors.push({
          id: 'validation.file.text-file-no-fallback',
          field: 'files',
          values: {
            fileName: file.fileName,
            fileExtension,
          },
        });
      }
    }
  });
}

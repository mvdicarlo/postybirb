import {
  FileSubmission,
  ISubmissionFields,
  PostData,
  ValidationResult,
} from '@postybirb/types';
import { Class } from 'type-fest';
import { UnknownWebsite } from '../../website';

/**
 * Defines methods for allowing file based posting.
 * Generally this will always be used by each supported website.
 * @interface FileWebsite
 */
export interface FileWebsite<T extends ISubmissionFields> {
  FileModel: Class<T>;
  supportsFile: true;
  supportsAdditionalFiles: boolean;

  createFileModel(): T;

  onPostFileSubmission(
    postData: PostData<FileSubmission, T>,
    cancellationToken: unknown
  ): Promise<unknown>;

  onValidateFileSubmission(
    postData: PostData<FileSubmission, T>
  ): Promise<ValidationResult>;
}

export function isFileWebsite(
  websiteInstance: UnknownWebsite
): websiteInstance is FileWebsite<ISubmissionFields> & UnknownWebsite {
  return Boolean(
    (websiteInstance as FileWebsite<ISubmissionFields> & UnknownWebsite)
      .supportsFile
  );
}

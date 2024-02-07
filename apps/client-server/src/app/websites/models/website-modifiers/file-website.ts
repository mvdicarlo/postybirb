import {
  FileSubmission,
  ISubmissionFile,
  IWebsiteFormFields,
  PostData,
  PostResponse,
  ValidationResult,
} from '@postybirb/types';
import { Class } from 'type-fest';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { UnknownWebsite } from '../../website';
import { ImageResizeProps } from '../../../post/models/image-resize-props';

export const FileWebsiteKey = 'FileModel';

/**
 * Defines methods for allowing file based posting.
 * Generally this will always be used by each supported website.
 * @interface FileWebsite
 */
export interface FileWebsite<T extends IWebsiteFormFields> {
  FileModel: Class<T>;
  supportsAdditionalFiles: boolean;

  createFileModel(): T;

  calculateImageResize(file: ISubmissionFile): ImageResizeProps | undefined;

  onPostFileSubmission(
    postData: PostData<FileSubmission, T>,
    files: unknown[],
    cancellationToken: CancellableToken
  ): Promise<PostResponse>;

  onValidateFileSubmission(
    postData: PostData<FileSubmission, T>
  ): Promise<ValidationResult>;
}

export function isFileWebsite(
  websiteInstance: UnknownWebsite
): websiteInstance is FileWebsite<IWebsiteFormFields> & UnknownWebsite {
  return Boolean(
    (websiteInstance as FileWebsite<IWebsiteFormFields> & UnknownWebsite)
      .supportsFile
  );
}

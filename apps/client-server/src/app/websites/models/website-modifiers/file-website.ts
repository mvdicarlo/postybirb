import {
  FileSubmission,
  ImageResizeProps,
  ISubmissionFile,
  IWebsiteFormFields,
  PostData,
  PostResponse,
  SimpleValidationResult,
} from '@postybirb/types';
import { Class } from 'type-fest';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import { UnknownWebsite } from '../../website';

export const FileWebsiteKey = 'FileModel';

export type ImplementedFileWebsite = FileWebsite<IWebsiteFormFields> &
  UnknownWebsite;

/**
 * Defines methods for allowing file based posting.
 * Generally this will always be used by each supported website.
 * @interface FileWebsite
 */
export interface FileWebsite<T extends IWebsiteFormFields> {
  FileModel: Class<T>;

  createFileModel(): T;

  calculateImageResize(file: ISubmissionFile): ImageResizeProps | undefined;

  /**
   * Handles the submission of a file to the website.
   *
   * @param {PostData<FileSubmission, T>} postData
   * @param {PostingFile[]} files - The files to post
   * @param {number} batchIndex - The index of the batch (if batching is required)
   * @param {CancellableToken} cancellationToken
   * @return {*}  {Promise<PostResponse>}
   */
  onPostFileSubmission(
    postData: PostData<FileSubmission, T>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse>;

  onValidateFileSubmission(
    postData: PostData<FileSubmission, T>,
  ): Promise<SimpleValidationResult>;
}

export function isFileWebsite(
  websiteInstance: UnknownWebsite,
): websiteInstance is ImplementedFileWebsite {
  return Boolean((websiteInstance as ImplementedFileWebsite).supportsFile);
}

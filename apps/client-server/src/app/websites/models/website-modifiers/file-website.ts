import {
  ImageResizeProps,
  IPostResponse,
  ISubmissionFile,
  IWebsiteFormFields,
  PostData,
  SimpleValidationResult,
} from '@postybirb/types';
import { CancellationToken } from '../../../posting/cancellation-token';
import { PostingFile } from '../../../posting/models/posting-file';
import { UnknownWebsite } from '../../website';
import { BaseWebsiteOptions } from '../base-website-options';

export const FileWebsiteKey = 'createFileModel';

export type ImplementedFileWebsite = FileWebsite & UnknownWebsite;

export interface PostBatchSourceUrl {
  url: string;
  /** Unit timestamp from when the source URL was persisted. */
  timestamp: string;
}

export interface PostBatchData {
  index: number;
  totalBatches: number;
  /** Unique URLs produced by prior non-evicted units for this account. */
  sourceUrls?: PostBatchSourceUrl[];
}

/**
 * Defines methods for allowing file based posting.
 * Generally this will always be used by each supported website.
 * @interface FileWebsite
 */
export interface FileWebsite<
  T extends IWebsiteFormFields = IWebsiteFormFields,
> {
  createFileModel(): BaseWebsiteOptions;

  calculateImageResize(file: ISubmissionFile): ImageResizeProps | undefined;

  /**
   * Handles the submission of a file to the website.
   *
   * @param {PostData<T>} postData
   * @param {PostingFile[]} files - The files to post
   * @param {number} batchIndex - The index of the batch (if batching is required)
   * @param {CancellationToken} cancellationToken
   * @return {*}  {Promise<IPostResponse>}
   */
  onPostFileSubmission(
    postData: PostData<T>,
    files: PostingFile[],
    cancellationToken: CancellationToken,
    batch: PostBatchData,
  ): Promise<IPostResponse>;

  onValidateFileSubmission(
    postData: PostData<T>,
  ): Promise<SimpleValidationResult>;
}

export function isFileWebsite(
  websiteInstance: UnknownWebsite,
): websiteInstance is ImplementedFileWebsite {
  return Boolean((websiteInstance as ImplementedFileWebsite).supportsFile);
}

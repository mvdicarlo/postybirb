import { ISubmissionMetadata } from '../submission-metadata.interface';
import { FileMetadata } from './file-metadata.type';

/**
 * Metadata for a file submission.
 * @extends ISubmissionMetadata
 * @property {string[]} order - The order of files for a submission.
 * @property {FileMetadata} modifiedFiles - Stores file specific metadata modifications (i.e. h/w alt text).
 */
export type FileSubmissionMetadata = ISubmissionMetadata & {
  /**
   * The order of files for a submission.
   * @type {string[]}
   */
  order: string[];
  /**
   * Stores file specific metadata modifications (i.e. h/w alt text).
   * @type {FileMetadata}
   */
  fileMetadata: FileMetadata;
};

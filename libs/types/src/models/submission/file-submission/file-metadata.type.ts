import { SubmissionFileId } from '../submission-file.interface';
import { FileMetadataFields } from './file-metadata-fields.type';

/**
 * Represents metadata associated with a file submission.
 * @typedef {Object} FileMetadata
 * @property {Record<SubmissionFileId, FileMetadataFields>} - Record of file IDs and their corresponding metadata.
 */
export type FileMetadata = Record<SubmissionFileId, FileMetadataFields>;

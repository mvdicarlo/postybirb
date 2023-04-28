import { FileMetadataFields } from './file-metadata-fields.type';

type FileId = string;

/**
 * Represents metadata associated with a file submission.
 * @typedef {Object} FileMetadata
 * @property {Object.<string, FileMetadataFields>} - Record of file IDs and their corresponding metadata.
 */
export type FileMetadata = Record<FileId, FileMetadataFields>;

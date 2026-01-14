import { SubmissionRating, SubmissionType } from '../../enums';
import { DescriptionValue } from '../../models/submission/description-value.type';
import { Tag } from '../../models/tag/tag.type';

/**
 * Default options to apply to all created submissions.
 */
export interface ICreateSubmissionDefaultOptions {
  tags?: Tag[];
  description?: DescriptionValue;
  rating?: SubmissionRating;
}

/**
 * Metadata for individual files during batch upload.
 */
export interface IFileMetadata {
  /** Original filename to match against */
  filename: string;
  /** Custom title for this file's submission */
  title: string;
}

export interface ICreateSubmissionDto {
  name: string;
  type: SubmissionType;
  isTemplate?: boolean;
  /** Default options (tags, description, rating) to apply to all created submissions */
  defaultOptions?: ICreateSubmissionDefaultOptions;
  /** Per-file metadata for batch uploads (title overrides per file) */
  fileMetadata?: IFileMetadata[];
}

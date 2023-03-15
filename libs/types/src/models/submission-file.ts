import { IBaseEntity } from './base-entity';
import { IFileBuffer } from './file-buffer';
import { FileDimensions } from './file-dimensions';
import { FileSubmissionMetadata } from './file-submission';
import { ISubmission } from './submission';

export interface ISubmissionFile extends FileDimensions, IBaseEntity {
  id: string;
  submission: ISubmission<FileSubmissionMetadata>;
  fileName: string;
  hash: string;
  mimeType: string;
  file: IFileBuffer;
  thumbnail: IFileBuffer | undefined;
  altFile: IFileBuffer | undefined;
  hasThumbnail: boolean;
  props: ISubmissionFileProps;
}

export interface ISubmissionFileProps {
  /**
   * Flag for determining if a thumbnail needs to be re-generated on file replace
   * @type {boolean}
   */
  hasCustomThumbnail: boolean;
}

export const DefaultSubmissionFileProps: ISubmissionFileProps = {
  hasCustomThumbnail: false,
};

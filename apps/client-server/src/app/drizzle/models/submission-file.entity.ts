import {
  EntityId,
  FileSubmissionMetadata,
  ISubmissionFile,
  ISubmissionFileDto,
} from '@postybirb/types';
import { instanceToPlain, Type } from 'class-transformer';
import { DatabaseEntity } from './database-entity';
import { FileBuffer } from './file-buffer.entity';
import { Submission } from './submission.entity';

export class SubmissionFile extends DatabaseEntity implements ISubmissionFile {
  submissionId: EntityId;

  primaryFileId: EntityId;

  altFileId: EntityId;

  thumbnailId: EntityId;

  @Type(() => Submission)
  submission: Submission<FileSubmissionMetadata>;

  fileName: string;

  hash: string;

  mimeType: string;

  @Type(() => FileBuffer)
  file: FileBuffer;

  @Type(() => FileBuffer)
  thumbnail?: FileBuffer;

  @Type(() => FileBuffer)
  altFile?: FileBuffer;

  hasThumbnail: boolean;

  hasAltFile: boolean;

  hasCustomThumbnail: boolean;

  size: number;

  width: number;

  height: number;

  constructor(entity: Partial<SubmissionFile>) {
    super(entity);
    Object.assign(this, entity);
  }

  toObject(): ISubmissionFile {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as ISubmissionFile;
  }

  toDTO(): ISubmissionFileDto {
    return this.toObject() as unknown as ISubmissionFileDto;
  }
}

import {
  FileSubmissionMetadata,
  ISubmissionFile,
  ISubmissionFileDto,
} from '@postybirb/types';
import { instanceToPlain, plainToClass, Type } from 'class-transformer';
import { submissionFile } from '../schemas';
import { DatabaseEntity } from './database-entity';
import { FileBuffer } from './file-buffer.entity';
import { Submission } from './submission.entity';

export class SubmissionFile extends DatabaseEntity implements ISubmissionFile {
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

  toObject(): ISubmissionFile {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as ISubmissionFile;
  }

  toDTO(): ISubmissionFileDto {
    return this.toObject() as unknown as ISubmissionFileDto;
  }

  static fromDBO(entity: typeof submissionFile.$inferSelect): SubmissionFile {
    return plainToClass(SubmissionFile, entity, {
      enableCircularCheck: true,
    });
  }
}

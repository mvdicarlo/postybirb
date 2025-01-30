import {
  EntityId,
  IFileBuffer,
  ISubSubmissionFileDto
} from '@postybirb/types';
import { instanceToPlain, Type } from 'class-transformer';
import { DatabaseEntity } from './database-entity';

export class FileBuffer extends DatabaseEntity implements IFileBuffer {
  submissionFileId: EntityId;

  @Type(() => Buffer)
  buffer: Buffer;

  fileName: string;

  mimeType: string;

  get size(): number {
    return this.buffer?.length || 0;
  }

  width: number;

  height: number;

  toObject(): IFileBuffer {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as IFileBuffer;
  }

  toDTO(): ISubSubmissionFileDto {
    return this.toObject() as unknown as ISubSubmissionFileDto;
  }
}

import { EntityId, FileBufferDto, IFileBuffer } from '@postybirb/types';
import { Exclude, instanceToPlain, Type } from 'class-transformer';
import { DatabaseEntity } from './database-entity';

export class FileBuffer extends DatabaseEntity implements IFileBuffer {
  submissionFileId: EntityId;

  @Type(() => Buffer)
  @Exclude({ toPlainOnly: true })
  buffer: Buffer;

  fileName: string;

  mimeType: string;

  size: number;

  width: number;

  height: number;

  toObject(): IFileBuffer {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as IFileBuffer;
  }

  toDTO(): FileBufferDto {
    return this.toObject() as unknown as FileBufferDto;
  }
}

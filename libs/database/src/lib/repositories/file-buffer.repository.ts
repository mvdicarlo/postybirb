import { getDatabase } from '../database';
import { FileBuffer } from '../entities/file-buffer.entity';
import { FileBufferSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

export class FileBufferRepository extends EntityRepository<
  'FileBufferSchema',
  FileBuffer
> {
  constructor() {
    super({
      schemaKey: 'FileBufferSchema',
      table: FileBufferSchema,
      query: getDatabase().query.FileBufferSchema,
      EntityClass: FileBuffer,
    });
  }
}

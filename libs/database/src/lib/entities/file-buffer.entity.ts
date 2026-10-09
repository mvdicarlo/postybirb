import type {
    EntityId,
    FileBufferDto,
    IFileBuffer,
} from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { FileBufferSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';

/**
 * Row alias mirroring drizzle's select shape for `FileBufferSchema`.
 * No relations.
 */
export type FileBufferRow = InferSelectModel<typeof FileBufferSchema>;

/**
 * Entity for `FileBufferSchema`. `buffer` is carried through `toObject`
 * but stripped from `toDTO` so binary data never reaches the wire payload.
 */
export class FileBuffer
  extends DatabaseEntity<IFileBuffer>
  implements IFileBuffer
{
  public readonly entitySchemaKey!: 'FileBufferSchema';

  public submissionFileId: EntityId;

  public buffer: Buffer;

  public fileName: string;

  public mimeType: string;

  public size: number;

  public width: number;

  public height: number;

  constructor(init: Partial<IFileBuffer> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'FileBufferSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.submissionFileId = init.submissionFileId ?? '';
    this.buffer = init.buffer ?? Buffer.alloc(0);
    this.fileName = init.fileName ?? '';
    this.mimeType = init.mimeType ?? '';
    this.size = init.size ?? 0;
    this.width = init.width ?? 0;
    this.height = init.height ?? 0;
  }

  public toObject(): IFileBuffer {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      submissionFileId: this.submissionFileId,
      buffer: this.buffer,
      fileName: this.fileName,
      mimeType: this.mimeType,
      size: this.size,
      width: this.width,
      height: this.height,
    };
  }

  public toDTO(): FileBufferDto {
    // Strip `buffer` from the wire payload.
    const { buffer: _buffer, ...rest } = this.toObject();
    return rest as unknown as FileBufferDto;
  }

  static fromRow(
    row: FileBufferRow,
    ctx: HydrationContext = new HydrationContext(),
  ): FileBuffer {
    return ctx.hydrate('FileBufferSchema', row, FileBuffer);
  }
}

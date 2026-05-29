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
 * Lib copy of the legacy `FileBuffer` entity. `buffer` is intentionally
 * carried through `toObject` here; the legacy copy used
 * `@Exclude({ toPlainOnly: true })` to strip it from the DTO. Equivalent
 * stripping happens in `toDTO()` so the public payload is unchanged.
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
    // Legacy parity: strip `buffer` from the wire payload.
    const { buffer: _buffer, ...rest } = this.toObject();
    return rest as unknown as FileBufferDto;
  }

  static fromRow(
    row: FileBufferRow,
    ctx: HydrationContext = new HydrationContext(),
  ): FileBuffer {
    return ctx.getOrCreate('FileBufferSchema', row.id, () => new FileBuffer(row));
  }

  static fromRows(
    rows: readonly FileBufferRow[],
    ctx: HydrationContext = new HydrationContext(),
  ): FileBuffer[] {
    return rows.map((r) => FileBuffer.fromRow(r, ctx));
  }
}

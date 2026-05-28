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
  public readonly entitySchemaKey = 'FileBufferSchema' as const;

  submissionFileId!: EntityId;

  buffer!: Buffer;

  fileName!: string;

  mimeType!: string;

  size!: number;

  width!: number;

  height!: number;

  public toObject(): IFileBuffer {
    return { ...this };
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
    return ctx.getOrCreate('FileBufferSchema', row.id, () =>
      Object.assign(new FileBuffer(), row),
    );
  }

  static fromRows(
    rows: readonly FileBufferRow[],
    ctx: HydrationContext = new HydrationContext(),
  ): FileBuffer[] {
    return rows.map((r) => FileBuffer.fromRow(r, ctx));
  }
}

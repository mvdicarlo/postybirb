import type {
    EntityId,
    FileSubmissionMetadata,
    ISubmissionFile,
    ISubmissionFileDto,
    SubmissionFileMetadata,
} from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import { RepositoryRegistry } from '../repositories/base/repository-registry';
import type { SubmissionFileSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';
import { FileBuffer, type FileBufferRow } from './file-buffer.entity';
import { Submission, type SubmissionRow } from './submission.entity';

export type SubmissionFileRow = InferSelectModel<typeof SubmissionFileSchema> & {
  submission?: SubmissionRow;
  file?: FileBufferRow;
  thumbnail?: FileBufferRow;
  altFile?: FileBufferRow;
};

export class SubmissionFile
  extends DatabaseEntity<ISubmissionFile>
  implements ISubmissionFile
{
  public readonly entitySchemaKey = 'SubmissionFileSchema' as const;

  submissionId!: EntityId;

  primaryFileId!: EntityId;

  altFileId!: EntityId;

  thumbnailId!: EntityId;

  submission!: Submission<FileSubmissionMetadata>;

  fileName!: string;

  hash!: string;

  mimeType!: string;

  file!: FileBuffer;

  thumbnail?: FileBuffer;

  altFile?: FileBuffer;

  hasThumbnail!: boolean;

  hasAltFile!: boolean;

  hasCustomThumbnail!: boolean;

  size!: number;

  width!: number;

  height!: number;

  metadata!: SubmissionFileMetadata;

  order!: number;

  public toObject(): ISubmissionFile {
    return { ...this };
  }

  public toDTO(): ISubmissionFileDto {
    return this.toObject();
  }

  /**
   * Load the file buffer columns lazily. Drizzle does not eagerly load
   * blob relations through nested `with` clauses, so this method fetches
   * them via the `FileBufferSchema` repository registered in the
   * `RepositoryRegistry`. The repository must be constructed (typically
   * during app startup) before this method is called.
   */
  public async load(fileTarget?: 'file' | 'thumbnail' | 'alt'): Promise<void> {
    const repo = RepositoryRegistry.get('FileBufferSchema');
    const fetch = (id: EntityId): Promise<FileBuffer> =>
      (repo as unknown as { findById: (id: EntityId) => Promise<FileBuffer> })
        .findById(id);

    if (fileTarget) {
      switch (fileTarget) {
        case 'file':
          this.file = await fetch(this.primaryFileId);
          break;
        case 'thumbnail':
          this.thumbnail = await fetch(this.thumbnailId);
          break;
        case 'alt':
          this.altFile = await fetch(this.altFileId);
          break;
        default:
          throw new Error('Invalid file target');
      }
      return;
    }

    this.file = await fetch(this.primaryFileId);
    if (this.thumbnailId) {
      this.thumbnail = await fetch(this.thumbnailId);
    }
    if (this.altFileId) {
      this.altFile = await fetch(this.altFileId);
    }
  }

  static fromRow(
    row: SubmissionFileRow,
    ctx: HydrationContext = new HydrationContext(),
  ): SubmissionFile {
    return ctx.getOrCreate(
      'SubmissionFileSchema',
      row.id,
      () => {
        const { submission, file, thumbnail, altFile, ...scalars } = row;
        return Object.assign(new SubmissionFile(), scalars);
      },
      (e) => {
        if (row.submission)
          e.submission = Submission.fromRow<FileSubmissionMetadata>(
            row.submission,
            ctx,
          );
        if (row.file) e.file = FileBuffer.fromRow(row.file, ctx);
        if (row.thumbnail) e.thumbnail = FileBuffer.fromRow(row.thumbnail, ctx);
        if (row.altFile) e.altFile = FileBuffer.fromRow(row.altFile, ctx);
      },
    );
  }

  static fromRows(
    rows: readonly SubmissionFileRow[],
    ctx: HydrationContext = new HydrationContext(),
  ): SubmissionFile[] {
    return rows.map((r) => SubmissionFile.fromRow(r, ctx));
  }
}

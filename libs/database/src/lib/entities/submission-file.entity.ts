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
  public readonly entitySchemaKey!: 'SubmissionFileSchema';

  public submissionId: EntityId;

  public primaryFileId: EntityId;

  public altFileId: EntityId;

  public thumbnailId: EntityId;

  public submission!: Submission<FileSubmissionMetadata>;

  public fileName: string;

  public hash: string;

  public mimeType: string;

  public file!: FileBuffer;

  public thumbnail?: FileBuffer;

  public altFile?: FileBuffer;

  public hasThumbnail: boolean;

  public hasAltFile: boolean;

  public hasCustomThumbnail: boolean;

  public size: number;

  public width: number;

  public height: number;

  public metadata: SubmissionFileMetadata;

  public order: number;

  constructor(init: Partial<ISubmissionFile> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'SubmissionFileSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.submissionId = init.submissionId ?? '';
    this.primaryFileId = (init.primaryFileId === undefined ? null : init.primaryFileId) as EntityId;
    this.altFileId = (init.altFileId === undefined ? null : init.altFileId) as EntityId;
    this.thumbnailId = (init.thumbnailId === undefined ? null : init.thumbnailId) as EntityId;
    this.fileName = init.fileName ?? '';
    this.hash = init.hash ?? '';
    this.mimeType = init.mimeType ?? '';
    this.hasThumbnail = init.hasThumbnail ?? false;
    this.hasAltFile = init.hasAltFile ?? false;
    this.hasCustomThumbnail = init.hasCustomThumbnail ?? false;
    this.size = init.size ?? 0;
    this.width = init.width ?? 0;
    this.height = init.height ?? 0;
    this.metadata = init.metadata ?? ({} as SubmissionFileMetadata);
    this.order = init.order ?? 0;
  }

  public toObject(): ISubmissionFile {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      submissionId: this.submissionId,
      primaryFileId: this.primaryFileId,
      altFileId: this.altFileId,
      thumbnailId: this.thumbnailId,
      submission: this.submission,
      fileName: this.fileName,
      hash: this.hash,
      mimeType: this.mimeType,
      file: this.file,
      thumbnail: this.thumbnail,
      altFile: this.altFile,
      hasThumbnail: this.hasThumbnail,
      hasAltFile: this.hasAltFile,
      hasCustomThumbnail: this.hasCustomThumbnail,
      size: this.size,
      width: this.width,
      height: this.height,
      metadata: this.metadata,
      order: this.order,
    };
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
      () => new SubmissionFile(row as unknown as Partial<ISubmissionFile>),
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

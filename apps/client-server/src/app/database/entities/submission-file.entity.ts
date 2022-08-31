/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable max-classes-per-file */
import { Entity, ManyToOne, OneToOne, Property } from '@mikro-orm/core';
import { ISubmissionFile } from '../../file/models/file';
import { IFileBuffer } from '../../file/models/file-buffer';
import { FileSubmissionMetadata } from '../../submission/models/file-submission';
import { ISubmission } from '../../submission/models/submission';
import { BaseEntity } from './base.entity';
import { Submission } from './submission.entity';

@Entity()
export class SubmissionFile
  extends BaseEntity<SubmissionFile, 'id'>
  implements ISubmissionFile
{
  @Property({ nullable: false })
  fileName: string;

  @Property({ nullable: false })
  hash: string;

  @Property({ nullable: false })
  mimeType: string;

  @OneToOne({
    entity: () => PrimaryFile,
    inversedBy: 'parent',
    orphanRemoval: true,
    lazy: true,
  })
  file: IFileBuffer;

  @ManyToOne(() => Submission, { nullable: false })
  submission: ISubmission<FileSubmissionMetadata>;

  @OneToOne({
    entity: () => ThumbnailFile,
    inversedBy: 'parent',
    orphanRemoval: true,
    lazy: true,
  })
  thumbnail: IFileBuffer;

  @OneToOne({
    entity: () => AltFile,
    inversedBy: 'parent',
    orphanRemoval: true,
    lazy: true,
    nullable: true,
  })
  altFile: IFileBuffer | undefined;

  @Property({ type: 'int', nullable: false, default: 0 })
  size: number;

  @Property({ type: 'int', nullable: false, default: 0 })
  width: number;

  @Property({ type: 'int', nullable: false, default: 0 })
  height: number;
}

@Entity()
export class ThumbnailFile
  extends BaseEntity<ThumbnailFile, 'id'>
  implements IFileBuffer
{
  @Property({ type: 'blob', nullable: false })
  buffer: Buffer;

  @Property({ nullable: false })
  fileName: string;

  @Property({ nullable: false })
  mimeType: string;

  @OneToOne({ entity: () => SubmissionFile, mappedBy: 'thumbnail' })
  parent: SubmissionFile;

  @Property({ type: 'int', nullable: false, default: 0 })
  size: number;

  @Property({ type: 'int', nullable: false, default: 0 })
  width: number;

  @Property({ type: 'int', nullable: false, default: 0 })
  height: number;
}

@Entity()
export class PrimaryFile
  extends BaseEntity<PrimaryFile, 'id'>
  implements IFileBuffer
{
  @Property({ type: 'blob', nullable: false })
  buffer: Buffer;

  @Property({ nullable: false })
  fileName: string;

  @Property({ nullable: false })
  mimeType: string;

  @OneToOne({ entity: () => SubmissionFile, mappedBy: 'file' })
  parent: SubmissionFile;

  @Property({ type: 'int', nullable: false, default: 0 })
  size: number;

  @Property({ type: 'int', nullable: false, default: 0 })
  width: number;

  @Property({ type: 'int', nullable: false, default: 0 })
  height: number;
}

@Entity()
export class AltFile extends BaseEntity<AltFile, 'id'> implements IFileBuffer {
  @Property({ type: 'blob', nullable: false })
  buffer: Buffer;

  @Property({ nullable: false })
  fileName: string;

  @Property({ nullable: false })
  mimeType: string;

  @OneToOne({ entity: () => SubmissionFile, mappedBy: 'altFile' })
  parent: SubmissionFile;

  @Property({ type: 'int', nullable: false, default: 0 })
  size: number;

  @Property({ type: 'int', nullable: false, default: 0 })
  width: number;

  @Property({ type: 'int', nullable: false, default: 0 })
  height: number;
}

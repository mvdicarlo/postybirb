/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable max-classes-per-file */
import { Entity, ManyToOne, OneToOne, Property } from '@mikro-orm/core';
import {
  ISubmissionFile,
  IFileBuffer,
  ISubmission,
  FileSubmissionMetadata,
  ISubmissionFileProps,
  DefaultSubmissionFileProps,
} from '@postybirb/types';
import { BaseEntity } from './base.entity';
import { Submission } from './submission.entity';

@Entity()
export class SubmissionFile
  extends BaseEntity<SubmissionFile>
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

  @ManyToOne(() => Submission, { nullable: false, inversedBy: 'files' })
  submission: ISubmission<FileSubmissionMetadata>;

  @OneToOne({
    entity: () => ThumbnailFile,
    inversedBy: 'parent',
    orphanRemoval: true,
    lazy: true,
    nullable: true,
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

  @Property({ type: 'integer', nullable: false, default: 0 })
  size: number;

  @Property({ type: 'integer', nullable: false, default: 0 })
  width: number;

  @Property({ type: 'integer', nullable: false, default: 0 })
  height: number;

  @Property({ type: 'boolean', nullable: false, default: false })
  hasThumbnail: boolean;

  @Property({
    type: 'json',
    nullable: false,
  })
  props: ISubmissionFileProps = DefaultSubmissionFileProps;
}

@Entity()
export class ThumbnailFile
  extends BaseEntity<ThumbnailFile>
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

  @Property({ type: 'integer', nullable: false, default: 0 })
  get size(): number {
    return this.buffer?.length || 0;
  }

  @Property({ type: 'integer', nullable: false, default: 0 })
  width: number;

  @Property({ type: 'integer', nullable: false, default: 0 })
  height: number;
}

@Entity()
export class PrimaryFile
  extends BaseEntity<PrimaryFile>
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

  @Property({ type: 'integer', nullable: false, default: 0 })
  get size(): number {
    return this.buffer?.length || 0;
  }

  @Property({ type: 'integer', nullable: false, default: 0 })
  width: number;

  @Property({ type: 'integer', nullable: false, default: 0 })
  height: number;
}

@Entity()
export class AltFile extends BaseEntity<AltFile> implements IFileBuffer {
  @Property({ type: 'blob', nullable: false })
  buffer: Buffer;

  @Property({ nullable: false })
  fileName: string;

  @Property({ nullable: false })
  mimeType: string;

  @OneToOne({ entity: () => SubmissionFile, mappedBy: 'altFile' })
  parent: SubmissionFile;

  @Property({ type: 'integer', nullable: false, default: 0 })
  get size(): number {
    return this.buffer?.length || 0;
  }

  @Property({ type: 'integer', nullable: false, default: 0 })
  width: number;

  @Property({ type: 'integer', nullable: false, default: 0 })
  height: number;
}

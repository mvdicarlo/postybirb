/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable max-classes-per-file */
import {
  Entity,
  EntityRepositoryType,
  ManyToOne,
  OneToOne,
  Property,
  Rel,
  wrap,
} from '@mikro-orm/core';
import {
  DefaultSubmissionFileProps,
  FileSubmissionMetadata,
  IFileBuffer,
  ISubSubmissionFileDto,
  ISubmission,
  ISubmissionFile,
  ISubmissionFileDto,
  ISubmissionFileProps,
} from '@postybirb/types';
import { PostyBirbRepository } from '../repositories/postybirb-repository';
import { PostyBirbEntity } from './postybirb-entity';
import { Submission } from './submission.entity';

/** @inheritdoc */
@Entity({ customRepository: () => PostyBirbRepository })
export class SubmissionFile extends PostyBirbEntity implements ISubmissionFile {
  [EntityRepositoryType]?: PostyBirbRepository<SubmissionFile>;

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
    lazy: false,
  })
  file: Rel<IFileBuffer>;

  @ManyToOne(() => Submission, { nullable: false, inversedBy: 'files' })
  submission: ISubmission<FileSubmissionMetadata>;

  @OneToOne({
    entity: () => ThumbnailFile,
    inversedBy: 'parent',
    orphanRemoval: true,
    lazy: false,
    nullable: true,
  })
  thumbnail: Rel<IFileBuffer>;

  @OneToOne({
    entity: () => AltFile,
    inversedBy: 'parent',
    orphanRemoval: true,
    lazy: false,
    nullable: true,
  })
  altFile?: Rel<IFileBuffer>;

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

  toJson(): ISubmissionFileDto {
    return {
      ...super.toJson(),
      fileName: this.fileName,
      mimeType: this.mimeType,
      size: this.size,
      width: this.width,
      height: this.height,
      hash: this.hash,
      hasThumbnail: this.hasThumbnail,
      props: this.props,
      file: wrap(this.file).toObject().toJson(),
      altFile: this.altFile
        ? wrap(this.altFile).toObject().toJson()
        : undefined,
      thumbnail: this.thumbnail
        ? wrap(this.thumbnail).toObject().toJson()
        : undefined,
    };
  }
}

/** @inheritdoc */
@Entity({ customRepository: () => PostyBirbRepository })
export class ThumbnailFile extends PostyBirbEntity implements IFileBuffer {
  [EntityRepositoryType]?: PostyBirbRepository<ThumbnailFile>;

  @Property({ type: 'blob', nullable: false })
  buffer: Buffer;

  @Property({ nullable: false })
  fileName: string;

  @Property({ nullable: false })
  mimeType: string;

  @OneToOne({ entity: () => SubmissionFile, mappedBy: 'thumbnail' })
  parent: Rel<SubmissionFile>;

  @Property({ type: 'integer', nullable: false, default: 0 })
  get size(): number {
    return this.buffer?.length || 0;
  }

  @Property({ type: 'integer', nullable: false, default: 0 })
  width: number;

  @Property({ type: 'integer', nullable: false, default: 0 })
  height: number;

  @Property({ type: 'boolean', nullable: false, default: false })
  hasThumbnail: boolean;

  toJson(): ISubSubmissionFileDto {
    return {
      ...super.toJson(),
      fileName: this.fileName,
      mimeType: this.mimeType,
      size: this.size,
    };
  }
}

/** @inheritdoc */
@Entity({ customRepository: () => PostyBirbRepository })
export class PrimaryFile extends PostyBirbEntity implements IFileBuffer {
  [EntityRepositoryType]?: PostyBirbRepository<PrimaryFile>;

  @Property({ type: 'blob', nullable: false })
  buffer: Buffer;

  @Property({ nullable: false })
  fileName: string;

  @Property({ nullable: false })
  mimeType: string;

  @OneToOne({ entity: () => SubmissionFile, mappedBy: 'file' })
  parent: Rel<SubmissionFile>;

  @Property({ type: 'integer', nullable: false, default: 0 })
  get size(): number {
    return this.buffer?.length || 0;
  }

  @Property({ type: 'integer', nullable: false, default: 0 })
  width: number;

  @Property({ type: 'integer', nullable: false, default: 0 })
  height: number;

  toJson(): ISubSubmissionFileDto {
    return {
      ...super.toJson(),
      fileName: this.fileName,
      mimeType: this.mimeType,
      size: this.size,
    };
  }
}

/** @inheritdoc */
@Entity({ customRepository: () => PostyBirbRepository })
export class AltFile extends PostyBirbEntity implements IFileBuffer {
  [EntityRepositoryType]?: PostyBirbRepository<AltFile>;

  @Property({ type: 'blob', nullable: false })
  buffer: Buffer;

  @Property({ nullable: false })
  fileName: string;

  @Property({ nullable: false })
  mimeType: string;

  @OneToOne({ entity: () => SubmissionFile, mappedBy: 'altFile' })
  parent: Rel<SubmissionFile>;

  @Property({ type: 'integer', nullable: false, default: 0 })
  get size(): number {
    return this.buffer?.length || 0;
  }

  @Property({ type: 'integer', nullable: false, default: 0 })
  width: number;

  @Property({ type: 'integer', nullable: false, default: 0 })
  height: number;

  toJson(): ISubSubmissionFileDto {
    return {
      ...super.toJson(),
      fileName: this.fileName,
      mimeType: this.mimeType,
      size: this.size,
    };
  }
}

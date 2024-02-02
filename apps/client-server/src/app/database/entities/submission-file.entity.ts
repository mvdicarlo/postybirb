/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable max-classes-per-file */
import {
  Entity,
  EntityRepositoryType,
  ManyToOne,
  OneToOne,
  Property,
  Rel,
  serialize,
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
    serializer: (s) => s.id,
  })
  file: Rel<IFileBuffer>;

  @ManyToOne(() => Submission, {
    nullable: false,
    inversedBy: 'files',
    serializer: (s) => s.id,
  })
  submission: ISubmission<FileSubmissionMetadata>;

  @OneToOne({
    entity: () => ThumbnailFile,
    inversedBy: 'parent',
    orphanRemoval: true,
    lazy: false,
    nullable: true,
    serializer: (s) => s.id,
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

  toJSON(): ISubmissionFileDto {
    return serialize(this) as ISubmissionFileDto;
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

  @OneToOne({
    entity: () => SubmissionFile,
    mappedBy: 'thumbnail',
    serializer: (s) => s.id,
  })
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

  toJSON(): ISubSubmissionFileDto {
    return serialize(this) as ISubSubmissionFileDto;
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

  @OneToOne({
    entity: () => SubmissionFile,
    mappedBy: 'file',
    serializer: (s) => s.id,
  })
  parent: Rel<SubmissionFile>;

  @Property({ type: 'integer', nullable: false, default: 0 })
  get size(): number {
    return this.buffer?.length || 0;
  }

  @Property({ type: 'integer', nullable: false, default: 0 })
  width: number;

  @Property({ type: 'integer', nullable: false, default: 0 })
  height: number;

  toJSON(): ISubSubmissionFileDto {
    return serialize(this) as ISubSubmissionFileDto;
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

  @OneToOne({
    entity: () => SubmissionFile,
    mappedBy: 'altFile',
    serializer: (s) => s.id,
  })
  parent: Rel<SubmissionFile>;

  @Property({ type: 'integer', nullable: false, default: 0 })
  get size(): number {
    return this.buffer?.length || 0;
  }

  @Property({ type: 'integer', nullable: false, default: 0 })
  width: number;

  @Property({ type: 'integer', nullable: false, default: 0 })
  height: number;

  toJSON(): ISubSubmissionFileDto {
    return serialize(this) as ISubSubmissionFileDto;
  }
}

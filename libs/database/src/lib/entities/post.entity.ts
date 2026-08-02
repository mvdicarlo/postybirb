import type {
    IEntityDto,
    IPost,
    SubmissionId,
    UnitOfWorkId,
} from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { PostSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';
import type { UnitOfWorkRow } from './unit-of-work.entity';

export type PostRow = InferSelectModel<typeof PostSchema> & {
  unitsOfWork?: UnitOfWorkRow[];
};

export class Post extends DatabaseEntity<IPost> implements IPost {
  public readonly entitySchemaKey!: 'PostSchema';

  public submissionId: SubmissionId;

  public unitsOfWork: UnitOfWorkId[];

  public completed: boolean;

  public cancelled: boolean;

  constructor(init: Partial<IPost> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'PostSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.submissionId = init.submissionId ?? '';
    this.unitsOfWork = [...(init.unitsOfWork ?? [])];
    this.completed = init.completed ?? false;
    this.cancelled = init.cancelled ?? false;
  }

  public toObject(): IPost {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      submissionId: this.submissionId,
      unitsOfWork: this.unitsOfWork,
      completed: this.completed,
      cancelled: this.cancelled,
    };
  }

  public toDTO(): IEntityDto<IPost> {
    return this.toObject();
  }

  static fromRow(
    row: PostRow,
    ctx: HydrationContext = new HydrationContext(),
  ): Post {
    const post: IPost = {
      id: row.id,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      submissionId: row.submissionId,
      unitsOfWork: row.unitsOfWork?.map(({ id }) => id) ?? [],
      completed: row.completed,
      cancelled: row.cancelled,
    };
    return ctx.hydrate('PostSchema', post, Post);
  }
}
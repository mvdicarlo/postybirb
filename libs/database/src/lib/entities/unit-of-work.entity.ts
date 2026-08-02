import {
    AccountId,
    EntityId,
    IEntityDto,
    IUnitOfWork,
    PostId,
    SubmissionFileId,
    SubmissionId,
    UnitOfWorkState,
} from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { UnitOfWorkSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';

export type UnitOfWorkRow = InferSelectModel<typeof UnitOfWorkSchema>;

export class UnitOfWork
  extends DatabaseEntity<IUnitOfWork>
  implements IUnitOfWork
{
  public readonly entitySchemaKey!: 'UnitOfWorkSchema';

  public postId: PostId;

  public submissionId: SubmissionId;

  public accountId: AccountId;

  public fileId?: SubmissionFileId;

  public fileHash?: string;

  public attempt: number;

  public data?: Record<string, unknown>;

  public response?: Record<string, unknown>;

  public evicted: boolean;

  public url?: string;

  public batch?: EntityId;

  public state: UnitOfWorkState;

  public get compositeKey(): string {
    return `${this.submissionId}:${this.accountId}:${this.fileId ?? ''}`;
  }

  public get isTerminated(): boolean {
    return (
      this.state === UnitOfWorkState.SUCCEEDED ||
      this.state === UnitOfWorkState.FAILED ||
      this.state === UnitOfWorkState.CANCELLED
    );
  }

  constructor(init: Partial<IUnitOfWork> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'UnitOfWorkSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.postId = init.postId ?? '';
    this.submissionId = init.submissionId ?? '';
    this.accountId = init.accountId ?? '';
    this.fileId = init.fileId ?? undefined;
    this.fileHash = init.fileHash ?? undefined;
    this.attempt = init.attempt ?? 0;
    this.data = init.data ?? undefined;
    this.response = init.response ?? undefined;
    this.evicted = init.evicted ?? false;
    this.url = init.url ?? undefined;
    this.batch = init.batch ?? undefined;
    this.state = init.state ?? ('' as UnitOfWorkState);
  }

  public toObject(): IUnitOfWork {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      postId: this.postId,
      submissionId: this.submissionId,
      accountId: this.accountId,
      fileId: this.fileId,
      fileHash: this.fileHash,
      attempt: this.attempt,
      data: this.data,
      response: this.response,
      evicted: this.evicted,
      url: this.url,
      batch: this.batch,
      state: this.state,
    };
  }

  public toDTO(): IEntityDto<IUnitOfWork> {
    return this.toObject();
  }

  static fromRow(
    row: UnitOfWorkRow,
    ctx: HydrationContext = new HydrationContext(),
  ): UnitOfWork {
    return ctx.hydrate('UnitOfWorkSchema', row, UnitOfWork);
  }
}
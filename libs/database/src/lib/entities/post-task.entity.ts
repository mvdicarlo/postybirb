import type {
    AccountId,
    Dependency,
    EntityId,
    IPostAccountSnapshot,
    IPostTask,
    ITaskError,
    NodeStatus,
    PostTaskDto,
} from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { PostTaskSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';
import { PostUnit, type PostUnitRow } from './post-unit.entity';

export type PostTaskRow = InferSelectModel<typeof PostTaskSchema> & {
  units?: PostUnitRow[];
};

export class PostTask extends DatabaseEntity<IPostTask> implements IPostTask {
  public readonly entitySchemaKey!: 'PostTaskSchema';

  public jobId: EntityId;

  public accountId?: AccountId;

  public websiteId: string;

  public status: NodeStatus;

  public dependency?: Dependency;

  public attempts: number;

  public maxAttempts: number;

  public sourceUrl?: string;

  public message?: string;

  public error?: ITaskError;

  public waitingUntil?: number;

  public accountSnapshot?: IPostAccountSnapshot;

  public units!: PostUnit[];

  constructor(init: Partial<IPostTask> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'PostTaskSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.jobId = init.jobId ?? '';
    this.accountId = init.accountId;
    this.websiteId = init.websiteId ?? '';
    this.status = init.status ?? ('' as NodeStatus);
    this.dependency = init.dependency;
    this.attempts = init.attempts ?? 0;
    this.maxAttempts = init.maxAttempts ?? 3;
    this.sourceUrl = init.sourceUrl;
    this.message = init.message;
    this.error = init.error;
    this.waitingUntil = init.waitingUntil;
    this.accountSnapshot = init.accountSnapshot;
  }

  public toObject(): IPostTask {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      jobId: this.jobId,
      accountId: this.accountId,
      websiteId: this.websiteId,
      status: this.status,
      dependency: this.dependency,
      attempts: this.attempts,
      maxAttempts: this.maxAttempts,
      sourceUrl: this.sourceUrl,
      message: this.message,
      error: this.error,
      waitingUntil: this.waitingUntil,
      accountSnapshot: this.accountSnapshot,
      units: this.units,
    };
  }

  public toDTO(): PostTaskDto {
    return {
      ...this.toObject(),
      units: this.units?.map((u) => u.toDTO()),
    } as unknown as PostTaskDto;
  }

  static fromRow(
    row: PostTaskRow,
    ctx: HydrationContext = new HydrationContext(),
  ): PostTask {
    return ctx.hydrate('PostTaskSchema', row, PostTask, (e) => {
      if (row.units) e.units = ctx.hydrateMany(PostUnit, row.units);
    });
  }
}

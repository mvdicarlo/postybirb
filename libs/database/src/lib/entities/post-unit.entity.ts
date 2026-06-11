import type {
    EntityId,
    IPostUnit,
    ITaskError,
    NodeStatus,
    PostUnitDto,
    SubmissionFileId,
    UnitKind,
} from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { PostUnitSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';

export type PostUnitRow = InferSelectModel<typeof PostUnitSchema>;

export class PostUnit extends DatabaseEntity<IPostUnit> implements IPostUnit {
  public readonly entitySchemaKey!: 'PostUnitSchema';

  public taskId: EntityId;

  public kind: UnitKind;

  public ordinal: number;

  public status: NodeStatus;

  public fileIds: SubmissionFileId[];

  public sourceUrl?: string;

  public error?: ITaskError;

  constructor(init: Partial<IPostUnit> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'PostUnitSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.taskId = init.taskId ?? '';
    this.kind = init.kind ?? ('' as UnitKind);
    this.ordinal = init.ordinal ?? 0;
    this.status = init.status ?? ('' as NodeStatus);
    this.fileIds = init.fileIds ?? [];
    this.sourceUrl = init.sourceUrl;
    this.error = init.error;
  }

  public toObject(): IPostUnit {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      taskId: this.taskId,
      kind: this.kind,
      ordinal: this.ordinal,
      status: this.status,
      fileIds: this.fileIds,
      sourceUrl: this.sourceUrl,
      error: this.error,
    };
  }

  public toDTO(): PostUnitDto {
    return this.toObject() as unknown as PostUnitDto;
  }

  static fromRow(
    row: PostUnitRow,
    ctx: HydrationContext = new HydrationContext(),
  ): PostUnit {
    return ctx.hydrate('PostUnitSchema', row, PostUnit);
  }
}

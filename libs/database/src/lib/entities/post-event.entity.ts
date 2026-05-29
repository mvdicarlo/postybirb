import type {
    AccountId,
    EntityId,
    IPostEvent,
    IPostEventError,
    IPostEventMetadata,
    PostEventDto,
    PostEventType,
} from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { PostEventSchema } from '../schemas';
import { Account, type AccountRow } from './account.entity';
import { DatabaseEntity } from './database-entity';
import { PostRecord, type PostRecordRow } from './post-record.entity';

export type PostEventRow = InferSelectModel<typeof PostEventSchema> & {
  postRecord?: PostRecordRow;
  account?: AccountRow;
};

export class PostEvent
  extends DatabaseEntity<IPostEvent>
  implements IPostEvent
{
  public readonly entitySchemaKey!: 'PostEventSchema';

  public postRecordId: EntityId;

  public accountId?: AccountId;

  /**
   * Eagerly-loaded relation. NOT part of `IPostEvent` — excluded from
   * `toObject` to keep the serialized payload aligned with the interface.
   */
  public postRecord!: PostRecord;

  public account?: Account;

  public eventType: PostEventType;

  public fileId?: EntityId;

  public sourceUrl?: string;

  public error?: IPostEventError;

  public metadata?: IPostEventMetadata;

  constructor(init: Partial<IPostEvent> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'PostEventSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.postRecordId = init.postRecordId ?? '';
    this.accountId = (init.accountId === undefined ? undefined : init.accountId) as AccountId | undefined;
    this.eventType = init.eventType ?? ('' as PostEventType);
    this.fileId = init.fileId;
    this.sourceUrl = init.sourceUrl;
    this.error = init.error;
    this.metadata = init.metadata;
  }

  public toObject(): IPostEvent {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      postRecordId: this.postRecordId,
      accountId: this.accountId,
      eventType: this.eventType,
      fileId: this.fileId,
      sourceUrl: this.sourceUrl,
      error: this.error,
      metadata: this.metadata,
    };
  }

  public toDTO(): PostEventDto {
    return {
      ...this.toObject(),
      account: this.account?.toDTO(),
    } as unknown as PostEventDto;
  }

  static fromRow(
    row: PostEventRow,
    ctx: HydrationContext = new HydrationContext(),
  ): PostEvent {
    return ctx.getOrCreate(
      'PostEventSchema',
      row.id,
      () => new PostEvent(row as Partial<IPostEvent>),
      (e) => {
        if (row.postRecord)
          e.postRecord = PostRecord.fromRow(row.postRecord, ctx);
        if (row.account) e.account = Account.fromRow(row.account, ctx);
      },
    );
  }

  static fromRows(
    rows: readonly PostEventRow[],
    ctx: HydrationContext = new HydrationContext(),
  ): PostEvent[] {
    return rows.map((r) => PostEvent.fromRow(r, ctx));
  }
}

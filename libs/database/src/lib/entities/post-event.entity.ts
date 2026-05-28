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
  public readonly entitySchemaKey = 'PostEventSchema' as const;

  postRecordId!: EntityId;

  accountId?: AccountId;

  postRecord!: PostRecord;

  account?: Account;

  eventType!: PostEventType;

  fileId?: EntityId;

  sourceUrl?: string;

  error?: IPostEventError;

  metadata?: IPostEventMetadata;

  public toObject(): IPostEvent {
    return { ...this };
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
      () => {
        const { postRecord, account, ...scalars } = row;
        return Object.assign(new PostEvent(), scalars);
      },
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

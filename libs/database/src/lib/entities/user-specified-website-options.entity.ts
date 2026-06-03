import type {
  AccountId,
  DynamicObject,
  IUserSpecifiedWebsiteOptions,
  SubmissionType,
  UserSpecifiedWebsiteOptionsDto,
} from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { UserSpecifiedWebsiteOptionsSchema } from '../schemas';
import { Account, type AccountRow } from './account.entity';
import { DatabaseEntity } from './database-entity';

export type UserSpecifiedWebsiteOptionsRow = InferSelectModel<
  typeof UserSpecifiedWebsiteOptionsSchema
> & {
  account?: AccountRow;
};

export class UserSpecifiedWebsiteOptions
  extends DatabaseEntity<IUserSpecifiedWebsiteOptions>
  implements IUserSpecifiedWebsiteOptions
{
  public readonly entitySchemaKey!: 'UserSpecifiedWebsiteOptionsSchema';

  public accountId: AccountId;

  public account!: Account;

  public type: SubmissionType;

  public options: DynamicObject;

  constructor(init: Partial<IUserSpecifiedWebsiteOptions> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'UserSpecifiedWebsiteOptionsSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.accountId = init.accountId ?? '';
    this.type = init.type ?? ('' as SubmissionType);
    this.options = init.options ?? {};
  }

  public toObject(): IUserSpecifiedWebsiteOptions {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      accountId: this.accountId,
      account: this.account,
      type: this.type,
      options: this.options,
    };
  }

  public toDTO(): UserSpecifiedWebsiteOptionsDto {
    return this.toObject();
  }

  static fromRow(
    row: UserSpecifiedWebsiteOptionsRow,
    ctx: HydrationContext = new HydrationContext(),
  ): UserSpecifiedWebsiteOptions {
    return ctx.hydrate(
      'UserSpecifiedWebsiteOptionsSchema',
      row,
      UserSpecifiedWebsiteOptions,
      (e) => {
        if (row.account) e.account = ctx.hydrateOne(Account, row.account);
      },
    );
  }
}

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
  public readonly entitySchemaKey = 'UserSpecifiedWebsiteOptionsSchema' as const;

  accountId!: AccountId;

  account!: Account;

  type!: SubmissionType;

  options!: DynamicObject;

  public toObject(): IUserSpecifiedWebsiteOptions {
    return { ...this };
  }

  public toDTO(): UserSpecifiedWebsiteOptionsDto {
    return this.toObject();
  }

  static fromRow(
    row: UserSpecifiedWebsiteOptionsRow,
    ctx: HydrationContext = new HydrationContext(),
  ): UserSpecifiedWebsiteOptions {
    return ctx.getOrCreate(
      'UserSpecifiedWebsiteOptionsSchema',
      row.id,
      () => {
        const { account, ...scalars } = row;
        return Object.assign(new UserSpecifiedWebsiteOptions(), scalars);
      },
      (e) => {
        if (row.account) e.account = Account.fromRow(row.account, ctx);
      },
    );
  }

  static fromRows(
    rows: readonly UserSpecifiedWebsiteOptionsRow[],
    ctx: HydrationContext = new HydrationContext(),
  ): UserSpecifiedWebsiteOptions[] {
    return rows.map((r) => UserSpecifiedWebsiteOptions.fromRow(r, ctx));
  }
}

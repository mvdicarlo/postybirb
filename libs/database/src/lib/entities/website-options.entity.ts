import type {
    AccountId,
    IWebsiteFormFields,
    IWebsiteOptions,
    SubmissionId,
    WebsiteOptionsDto,
} from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { WebsiteOptionsSchema } from '../schemas';
import { Account, type AccountRow } from './account.entity';
import { DatabaseEntity } from './database-entity';
// Submission imported as a value for `fromRow` recursion; the import is a
// runtime cycle but TS handles it because the entity body never references
// `Submission` at module-init time (only inside the static method body).
import { Submission, type SubmissionRow } from './submission.entity';

/**
 * Row alias for `WebsiteOptionsSchema`. Both relations are optional
 * because drizzle omits them when no `with` clause requests them.
 */
export type WebsiteOptionsRow = InferSelectModel<typeof WebsiteOptionsSchema> & {
  account?: AccountRow;
  submission?: SubmissionRow;
};

export class WebsiteOptions
  extends DatabaseEntity<IWebsiteOptions>
  implements IWebsiteOptions
{
  public readonly entitySchemaKey = 'WebsiteOptionsSchema' as const;

  accountId!: AccountId;

  submissionId!: SubmissionId;

  account!: Account;

  submission!: Submission;

  data!: IWebsiteFormFields;

  isDefault!: boolean;

  public toObject(): IWebsiteOptions {
    return { ...this };
  }

  public toDTO(): WebsiteOptionsDto {
    return {
      ...this.toObject(),
      submission: this.submission?.toDTO(),
    } as unknown as WebsiteOptionsDto;
  }

  static fromRow(
    row: WebsiteOptionsRow,
    ctx: HydrationContext = new HydrationContext(),
  ): WebsiteOptions {
    return ctx.getOrCreate(
      'WebsiteOptionsSchema',
      row.id,
      () => {
        const { account, submission, ...scalars } = row;
        return Object.assign(new WebsiteOptions(), scalars);
      },
      (e) => {
        if (row.account) e.account = Account.fromRow(row.account, ctx);
        if (row.submission)
          e.submission = Submission.fromRow(row.submission, ctx);
      },
    );
  }

  static fromRows(
    rows: readonly WebsiteOptionsRow[],
    ctx: HydrationContext = new HydrationContext(),
  ): WebsiteOptions[] {
    return rows.map((r) => WebsiteOptions.fromRow(r, ctx));
  }
}

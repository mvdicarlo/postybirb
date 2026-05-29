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
  public readonly entitySchemaKey!: 'WebsiteOptionsSchema';

  public accountId: AccountId;

  /**
   * Class-only field carried for legacy parity; not part of
   * `IWebsiteOptions` (which exposes the resolved `submission` relation).
   * Excluded from `toObject`.
   */
  public submissionId: SubmissionId;

  public account!: Account;

  public submission!: Submission;

  public data: IWebsiteFormFields;

  public isDefault: boolean;

  constructor(init: Partial<IWebsiteOptions> & { submissionId?: SubmissionId } = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'WebsiteOptionsSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.accountId = init.accountId ?? '';
    this.submissionId = init.submissionId ?? '';
    this.data = init.data ?? ({} as IWebsiteFormFields);
    this.isDefault = init.isDefault ?? false;
  }

  public toObject(): IWebsiteOptions {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      accountId: this.accountId,
      account: this.account,
      submission: this.submission,
      data: this.data,
      isDefault: this.isDefault,
    };
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
      () => new WebsiteOptions(row as Partial<IWebsiteOptions> & { submissionId?: SubmissionId }),
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

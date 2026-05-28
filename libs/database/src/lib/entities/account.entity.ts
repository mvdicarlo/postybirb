import type {
    IAccount,
    IAccountDto,
    ILoginState,
    SubmissionType,
} from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { AccountSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';
import { WebsiteData, type WebsiteDataRow } from './website-data.entity';

/**
 * Minimal structural type for the runtime website instance attached to an
 * `Account` via `withWebsiteInstance`. The legacy entity imports
 * `UnknownWebsite` directly from `apps/client-server/.../websites/website`,
 * which the lib cannot depend on. Concrete website classes already satisfy
 * this shape, so the Phase D cutover requires no change at the call site.
 */
export interface AccountWebsiteInstanceLike {
  getWebsiteData(): unknown;
  getLoginState(): ILoginState;
  getSupportedTypes(): SubmissionType[];
  decoratedProps: {
    metadata: {
      displayName: string;
    };
  };
}

/**
 * Row alias for `AccountSchema`. Optional `websiteData` relation; all
 * relation properties are optional because drizzle omits them when no
 * matching `with` clause is supplied.
 */
export type AccountRow = InferSelectModel<typeof AccountSchema> & {
  websiteData?: WebsiteDataRow;
};

export class Account extends DatabaseEntity<IAccount> implements IAccount {
  public readonly entitySchemaKey = 'AccountSchema' as const;

  name!: string;

  website!: string;

  groups: string[] = [];

  /**
   * Eagerly-loaded website data row. Stripped from `toDTO` payloads —
   * exposed only via the per-website-instance projection. Typed as
   * required to satisfy `IAccount` even though drizzle omits it when no
   * `with: { websiteData: true }` clause is present (legacy parity).
   */
  websiteData!: WebsiteData;

  /**
   * Runtime website instance — NOT a database column. Attached via
   * `withWebsiteInstance` and consumed by `toDTO` for the DTO payload.
   * Excluded from `toObject` so it never leaks into serialized state.
   */
  websiteInstance?: AccountWebsiteInstanceLike;

  public toObject(): IAccount {
    const { websiteInstance: _wi, ...rest } = this;
    return rest as unknown as IAccount;
  }

  public toDTO(): IAccountDto {
    const dto: IAccountDto = {
      ...(this.toObject() as unknown as IAccountDto),
      data: (this.websiteInstance?.getWebsiteData() ?? {}) as IAccountDto['data'],
      state: this.websiteInstance?.getLoginState() ?? {
        isLoggedIn: false,
        username: '',
        pending: false,
        lastUpdated: null,
      },
      websiteInfo: {
        websiteDisplayName:
          this.websiteInstance?.decoratedProps.metadata.displayName ?? '',
        supports: this.websiteInstance?.getSupportedTypes() ?? [],
      },
    };
    return dto;
  }

  withWebsiteInstance(websiteInstance: AccountWebsiteInstanceLike): this {
    this.websiteInstance = websiteInstance;
    return this;
  }

  static fromRow(
    row: AccountRow,
    ctx: HydrationContext = new HydrationContext(),
  ): Account {
    return ctx.getOrCreate(
      'AccountSchema',
      row.id,
      () => {
        const { websiteData, ...scalars } = row;
        return Object.assign(new Account(), scalars);
      },
      (e) => {
        if (row.websiteData) {
          e.websiteData = WebsiteData.fromRow(row.websiteData, ctx);
        }
      },
    );
  }

  static fromRows(
    rows: readonly AccountRow[],
    ctx: HydrationContext = new HydrationContext(),
  ): Account[] {
    return rows.map((r) => Account.fromRow(r, ctx));
  }
}

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
 * `Account` via `withWebsiteInstance`. The lib uses this local interface
 * rather than importing concrete website classes from `apps/client-server`.
 * All website implementations already satisfy this shape.
 */
export interface AccountWebsiteInstanceLike {
  getWebsiteData(): unknown;
  getLoginState(): ILoginState;
  getSupportedTypes(): SubmissionType[];
  decoratedProps: {
    metadata: {
      displayName?: string;
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
  public readonly entitySchemaKey!: 'AccountSchema';

  public name: string;

  public website: string;

  public groups: string[];

  /**
   * Eagerly-loaded website data row. Stripped from `toDTO` payloads —
   * exposed only via the per-website-instance projection. Typed as
   * required to satisfy `IAccount` even though drizzle omits it when no
   * `with: { websiteData: true }` clause is supplied.
   */
  public websiteData!: WebsiteData;

  /**
   * Runtime website instance — NOT a database column. Attached via
   * `withWebsiteInstance` and consumed by `toDTO` for the DTO payload.
   * Excluded from `toObject` so it never leaks into serialized state.
   */
  public websiteInstance?: AccountWebsiteInstanceLike;

  constructor(init: Partial<IAccount> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'AccountSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.name = init.name ?? '';
    this.website = init.website ?? '';
    this.groups = init.groups ?? [];
  }

  public toObject(): IAccount {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      name: this.name,
      website: this.website,
      groups: this.groups,
    } as IAccount;
  }

  public toDTO(): IAccountDto {
    return {
      ...this.toObject(),
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
    } as IAccountDto;
  }

  withWebsiteInstance(websiteInstance: AccountWebsiteInstanceLike | undefined): this {
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
      () => new Account(row),
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

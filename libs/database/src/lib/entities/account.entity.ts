import type {
    EntityId,
    IAccount,
  IEntityDto,
} from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { AccountSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';
import { WebsiteData, type WebsiteDataRow } from './website-data.entity';

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

  public defaultFileTemplateId: EntityId | null;

  public defaultMessageTemplateId: EntityId | null;

  /**
   * Eagerly-loaded website data row. Stripped from `toDTO` payloads —
   * exposed only via the per-website-instance projection. Typed as
   * required to satisfy `IAccount` even though drizzle omits it when no
   * `with: { websiteData: true }` clause is supplied.
   */
  public websiteData!: WebsiteData;

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
    this.defaultFileTemplateId = init.defaultFileTemplateId ?? null;
    this.defaultMessageTemplateId = init.defaultMessageTemplateId ?? null;
  }

  public toObject(): IAccount {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      name: this.name,
      website: this.website,
      groups: this.groups,
      defaultFileTemplateId: this.defaultFileTemplateId,
      defaultMessageTemplateId: this.defaultMessageTemplateId,
    } as IAccount;
  }

  public toDTO(): IEntityDto<IAccount> {
    return this.toObject() as IEntityDto<IAccount>;
  }

  static fromRow(
    row: AccountRow,
    ctx: HydrationContext = new HydrationContext(),
  ): Account {
    return ctx.hydrate('AccountSchema', row, Account, (e) => {
      if (row.websiteData) {
        e.websiteData = ctx.hydrateOne(WebsiteData, row.websiteData);
      }
    });
  }
}

import type {
    DynamicObject,
    IWebsiteData,
    IWebsiteDataDto,
} from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { WebsiteDataSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';

/**
 * Row alias for `WebsiteDataSchema`. The `account` back-relation is
 * intentionally NOT typed here — populating it would create a circular
 * type with `Account.websiteData`. Pass it externally if a caller needs it;
 * `fromRow` leaves it unset.
 */
export type WebsiteDataRow = InferSelectModel<typeof WebsiteDataSchema>;

export class WebsiteData<T extends DynamicObject = DynamicObject>
  extends DatabaseEntity<IWebsiteData<T>>
  implements IWebsiteData<T>
{
  public readonly entitySchemaKey!: 'WebsiteDataSchema';

  public data: T;

  constructor(init: Partial<IWebsiteData<T>> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'WebsiteDataSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.data = (init.data ?? ({} as T)) as T;
  }

  public toObject(): IWebsiteData<T> {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      data: this.data,
    };
  }

  public toDTO(): IWebsiteDataDto {
    return this.toObject();
  }

  static fromRow(
    row: WebsiteDataRow,
    ctx: HydrationContext = new HydrationContext(),
  ): WebsiteData {
    return ctx.hydrate('WebsiteDataSchema', row, WebsiteData);
  }
}

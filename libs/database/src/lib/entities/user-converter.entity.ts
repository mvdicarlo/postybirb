import type { IUserConverter, UserConverterDto } from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { UserConverterSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';

export type UserConverterRow = InferSelectModel<typeof UserConverterSchema>;

export class UserConverter
  extends DatabaseEntity<IUserConverter>
  implements IUserConverter
{
  public readonly entitySchemaKey!: 'UserConverterSchema';

  public username: string;

  public convertTo: Record<string, string>;

  constructor(init: Partial<IUserConverter> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'UserConverterSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.username = init.username ?? '';
    this.convertTo = init.convertTo ?? {};
  }

  public toObject(): IUserConverter {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      username: this.username,
      convertTo: this.convertTo,
    };
  }

  public toDTO(): UserConverterDto {
    return this.toObject();
  }

  static fromRow(
    row: UserConverterRow,
    ctx: HydrationContext = new HydrationContext(),
  ): UserConverter {
    return ctx.hydrate('UserConverterSchema', row, UserConverter);
  }
}

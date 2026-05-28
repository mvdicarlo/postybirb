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
  public readonly entitySchemaKey = 'UserConverterSchema' as const;

  username!: string;

  convertTo!: Record<string, string>;

  public toObject(): IUserConverter {
    return { ...this };
  }

  public toDTO(): UserConverterDto {
    return this.toObject();
  }

  static fromRow(
    row: UserConverterRow,
    ctx: HydrationContext = new HydrationContext(),
  ): UserConverter {
    return ctx.getOrCreate('UserConverterSchema', row.id, () =>
      Object.assign(new UserConverter(), row),
    );
  }

  static fromRows(
    rows: readonly UserConverterRow[],
    ctx: HydrationContext = new HydrationContext(),
  ): UserConverter[] {
    return rows.map((r) => UserConverter.fromRow(r, ctx));
  }
}

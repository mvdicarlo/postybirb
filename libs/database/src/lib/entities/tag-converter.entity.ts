import type { ITagConverter, TagConverterDto } from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { TagConverterSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';

export type TagConverterRow = InferSelectModel<typeof TagConverterSchema>;

export class TagConverter
  extends DatabaseEntity<ITagConverter>
  implements ITagConverter
{
  public readonly entitySchemaKey = 'TagConverterSchema' as const;

  tag!: string;

  convertTo!: Record<string, string>;

  public toObject(): ITagConverter {
    return { ...this };
  }

  public toDTO(): TagConverterDto {
    return this.toObject();
  }

  static fromRow(
    row: TagConverterRow,
    ctx: HydrationContext = new HydrationContext(),
  ): TagConverter {
    return ctx.getOrCreate('TagConverterSchema', row.id, () =>
      Object.assign(new TagConverter(), row),
    );
  }

  static fromRows(
    rows: readonly TagConverterRow[],
    ctx: HydrationContext = new HydrationContext(),
  ): TagConverter[] {
    return rows.map((r) => TagConverter.fromRow(r, ctx));
  }
}

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
  public readonly entitySchemaKey!: 'TagConverterSchema';

  public tag: string;

  public convertTo: Record<string, string>;

  constructor(init: Partial<ITagConverter> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'TagConverterSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.tag = init.tag ?? '';
    this.convertTo = init.convertTo ?? {};
  }

  public toObject(): ITagConverter {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      tag: this.tag,
      convertTo: this.convertTo,
    };
  }

  public toDTO(): TagConverterDto {
    return this.toObject();
  }

  static fromRow(
    row: TagConverterRow,
    ctx: HydrationContext = new HydrationContext(),
  ): TagConverter {
    return ctx.getOrCreate('TagConverterSchema', row.id, () => new TagConverter(row));
  }

  static fromRows(
    rows: readonly TagConverterRow[],
    ctx: HydrationContext = new HydrationContext(),
  ): TagConverter[] {
    return rows.map((r) => TagConverter.fromRow(r, ctx));
  }
}

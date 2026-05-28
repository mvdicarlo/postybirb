import type { ITagGroup, TagGroupDto } from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { TagGroupSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';

export type TagGroupRow = InferSelectModel<typeof TagGroupSchema>;

export class TagGroup extends DatabaseEntity<ITagGroup> implements ITagGroup {
  public readonly entitySchemaKey = 'TagGroupSchema' as const;

  name!: string;

  tags!: string[];

  public toObject(): ITagGroup {
    return { ...this };
  }

  public toDTO(): TagGroupDto {
    return this.toObject();
  }

  static fromRow(
    row: TagGroupRow,
    ctx: HydrationContext = new HydrationContext(),
  ): TagGroup {
    return ctx.getOrCreate('TagGroupSchema', row.id, () =>
      Object.assign(new TagGroup(), row),
    );
  }

  static fromRows(
    rows: readonly TagGroupRow[],
    ctx: HydrationContext = new HydrationContext(),
  ): TagGroup[] {
    return rows.map((r) => TagGroup.fromRow(r, ctx));
  }
}

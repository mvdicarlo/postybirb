import type { ITagGroup, TagGroupDto } from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { TagGroupSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';

export type TagGroupRow = InferSelectModel<typeof TagGroupSchema>;

export class TagGroup extends DatabaseEntity<ITagGroup> implements ITagGroup {
  public readonly entitySchemaKey!: 'TagGroupSchema';

  public name: string;

  public tags: string[];

  constructor(init: Partial<ITagGroup> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'TagGroupSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.name = init.name ?? '';
    this.tags = init.tags ?? [];
  }

  public toObject(): ITagGroup {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      name: this.name,
      tags: this.tags,
    };
  }

  public toDTO(): TagGroupDto {
    return this.toObject();
  }

  static fromRow(
    row: TagGroupRow,
    ctx: HydrationContext = new HydrationContext(),
  ): TagGroup {
    return ctx.getOrCreate('TagGroupSchema', row.id, () => new TagGroup(row));
  }

  static fromRows(
    rows: readonly TagGroupRow[],
    ctx: HydrationContext = new HydrationContext(),
  ): TagGroup[] {
    return rows.map((r) => TagGroup.fromRow(r, ctx));
  }
}

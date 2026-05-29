import type {
    Description,
    ICustomShortcut,
    ICustomShortcutDto,
} from '@postybirb/types';
import { DefaultDescription } from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { CustomShortcutSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';

/**
 * Row alias mirroring drizzle's select shape for `CustomShortcutSchema`.
 * No relations, so the alias is the bare select shape.
 */
export type CustomShortcutRow = InferSelectModel<typeof CustomShortcutSchema>;

/**
 * Entity for `CustomShortcutSchema`. No relation eager-loads.
 */
export class CustomShortcut
  extends DatabaseEntity<ICustomShortcut>
  implements ICustomShortcut
{
  public readonly entitySchemaKey!: 'CustomShortcutSchema';

  public name: string;

  public shortcut: Description;

  constructor(init: Partial<ICustomShortcut> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'CustomShortcutSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.name = init.name ?? '';
    this.shortcut = init.shortcut ?? DefaultDescription();
  }

  public toObject(): ICustomShortcut {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      name: this.name,
      shortcut: this.shortcut,
    };
  }

  public toDTO(): ICustomShortcutDto {
    return this.toObject();
  }

  static fromRow(
    row: CustomShortcutRow,
    ctx: HydrationContext = new HydrationContext(),
  ): CustomShortcut {
    return ctx.getOrCreate('CustomShortcutSchema', row.id, () => new CustomShortcut(row));
  }

  static fromRows(
    rows: readonly CustomShortcutRow[],
    ctx: HydrationContext = new HydrationContext(),
  ): CustomShortcut[] {
    return rows.map((r) => CustomShortcut.fromRow(r, ctx));
  }
}

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
 * Lib copy of the legacy `CustomShortcut` entity. Behaviourally identical;
 * the legacy `apps/client-server` copy is left untouched until Phase E.
 */
export class CustomShortcut
  extends DatabaseEntity<ICustomShortcut>
  implements ICustomShortcut
{
  public readonly entitySchemaKey = 'CustomShortcutSchema' as const;

  name!: string;

  shortcut: Description = DefaultDescription();

  public toObject(): ICustomShortcut {
    return { ...this };
  }

  public toDTO(): ICustomShortcutDto {
    return this.toObject();
  }

  static fromRow(
    row: CustomShortcutRow,
    ctx: HydrationContext = new HydrationContext(),
  ): CustomShortcut {
    return ctx.getOrCreate('CustomShortcutSchema', row.id, () =>
      Object.assign(new CustomShortcut(), row),
    );
  }

  static fromRows(
    rows: readonly CustomShortcutRow[],
    ctx: HydrationContext = new HydrationContext(),
  ): CustomShortcut[] {
    return rows.map((r) => CustomShortcut.fromRow(r, ctx));
  }
}

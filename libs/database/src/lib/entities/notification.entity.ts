import type { INotification } from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { NotificationSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';

export type NotificationRow = InferSelectModel<typeof NotificationSchema>;

export class Notification
  extends DatabaseEntity<INotification>
  implements INotification
{
  public readonly entitySchemaKey = 'NotificationSchema' as const;

  title!: string;

  message!: string;

  tags!: string[];

  data!: Record<string, unknown>;

  isRead!: boolean;

  hasEmitted!: boolean;

  type!: 'warning' | 'error' | 'info' | 'success';

  public toObject(): INotification {
    return { ...this };
  }

  public toDTO(): INotification {
    return this.toObject();
  }

  static fromRow(
    row: NotificationRow,
    ctx: HydrationContext = new HydrationContext(),
  ): Notification {
    return ctx.getOrCreate('NotificationSchema', row.id, () =>
      Object.assign(new Notification(), row),
    );
  }

  static fromRows(
    rows: readonly NotificationRow[],
    ctx: HydrationContext = new HydrationContext(),
  ): Notification[] {
    return rows.map((r) => Notification.fromRow(r, ctx));
  }
}

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
  public readonly entitySchemaKey!: 'NotificationSchema';

  public title: string;

  public message: string;

  public tags: string[];

  public data: Record<string, unknown>;

  public isRead: boolean;

  public hasEmitted: boolean;

  public type: 'warning' | 'error' | 'info' | 'success';

  constructor(init: Partial<INotification> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'NotificationSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.title = init.title ?? '';
    this.message = init.message ?? '';
    this.tags = init.tags ?? [];
    this.data = init.data ?? {};
    this.isRead = init.isRead ?? false;
    this.hasEmitted = init.hasEmitted ?? false;
    this.type = init.type ?? 'info';
  }

  public toObject(): INotification {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      title: this.title,
      message: this.message,
      tags: this.tags,
      data: this.data,
      isRead: this.isRead,
      hasEmitted: this.hasEmitted,
      type: this.type,
    };
  }

  public toDTO(): INotification {
    return this.toObject();
  }

  static fromRow(
    row: NotificationRow,
    ctx: HydrationContext = new HydrationContext(),
  ): Notification {
    return ctx.hydrate('NotificationSchema', row, Notification);
  }
}

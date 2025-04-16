import { INotification } from '@postybirb/types';
import { instanceToPlain } from 'class-transformer';
import { DatabaseEntity } from './database-entity';

export class Notification extends DatabaseEntity implements INotification {
  title: string;

  message: string;

  tags: string[];

  data: Record<string, unknown>;

  isRead: boolean;

  hasEmitted: boolean;

  type: 'warning' | 'error' | 'info' | 'success';

  toObject(): INotification {
    return instanceToPlain(this, {}) as INotification;
  }

  toDTO(): INotification {
    return this.toObject() as unknown as INotification;
  }
}

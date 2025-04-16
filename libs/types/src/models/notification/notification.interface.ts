import { IEntity } from '../database/entity.interface';

export interface INotification extends IEntity {
  title: string;
  message: string;
  tags: string[];
  data: Record<string, unknown>;
  isRead: boolean;
  hasEmitted: boolean;
  type: 'warning' | 'error' | 'info' | 'success';
}

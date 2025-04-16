import { INotification } from '../../models';

export type IUpdateNotificationDto = Pick<
  INotification,
  'isRead' | 'hasEmitted'
>;

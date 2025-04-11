import { INotification } from '../../models';

export type ICreateNotificationDto = Pick<
  INotification,
  'title' | 'message' | 'tags' | 'data' | 'type'
>;

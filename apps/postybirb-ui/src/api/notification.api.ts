import {
  ICreateNotificationDto,
  INotification,
  IUpdateNotificationDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class NotificationApi extends BaseApi<
  INotification,
  ICreateNotificationDto,
  IUpdateNotificationDto
> {
  constructor() {
    super('notifications');
  }
}

export default new NotificationApi();

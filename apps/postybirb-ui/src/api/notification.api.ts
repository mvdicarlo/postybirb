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
    super('notification');
  }
}

export default new NotificationApi();

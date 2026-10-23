import {
  CreateNotificationDto,
  INotification,
  UpdateNotificationDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class NotificationApi extends BaseApi<
  INotification,
  CreateNotificationDto,
  UpdateNotificationDto
> {
  constructor() {
    super('notifications');
  }
}

export default new NotificationApi();

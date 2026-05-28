import { Notification } from '../entities/notification.entity';
import { getDatabase } from '../database';
import { NotificationSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

export class NotificationRepository extends EntityRepository<
  'NotificationSchema',
  Notification
> {
  constructor() {
    super({
      schemaKey: 'NotificationSchema',
      table: NotificationSchema,
      query: getDatabase().query.NotificationSchema,
      EntityClass: Notification,
    });
  }
}

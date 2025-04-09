import { Injectable, Optional } from '@nestjs/common';
import { NOTIFICATION_UPDATES } from '@postybirb/socket-events';
import { EntityId } from '@postybirb/types';
import { PostyBirbService } from '../common/service/postybirb-service';
import { Notification } from '../drizzle/models/notification.entity';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { CreateNotificationDto } from './dtos/create-notification.dto';
import { UpdateNotificationDto } from './dtos/update-notification.dto';

@Injectable()
export class NotificationsService extends PostyBirbService<'NotificationSchema'> {
  constructor(@Optional() webSocket?: WSGateway) {
    super('NotificationSchema', webSocket);
    this.repository.subscribe('NotificationSchema', () => this.emit());
  }

  async create(createDto: CreateNotificationDto): Promise<Notification> {
    this.logger
      .withMetadata(createDto)
      .info(`Creating notification '${createDto.title}'`);
    return this.repository.insert(createDto);
  }

  update(id: EntityId, update: UpdateNotificationDto) {
    this.logger.withMetadata(update).info(`Updating notification '${id}'`);
    return this.repository.update(id, update);
  }

  protected async emit() {
    super.emit({
      event: NOTIFICATION_UPDATES,
      data: (await this.repository.findAll()).map((entity) => entity.toDTO()),
    });
  }
}

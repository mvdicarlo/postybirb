import { Injectable, Optional } from '@nestjs/common';
import { NOTIFICATION_UPDATES } from '@postybirb/socket-events';
import { EntityId } from '@postybirb/types';
import { Notification as ElectronNotification } from 'electron';
import { PostyBirbService } from '../common/service/postybirb-service';
import { Notification } from '../drizzle/models/notification.entity';
import { SettingsService } from '../settings/settings.service';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { CreateNotificationDto } from './dtos/create-notification.dto';
import { UpdateNotificationDto } from './dtos/update-notification.dto';

@Injectable()
export class NotificationsService extends PostyBirbService<'NotificationSchema'> {
  constructor(
    private readonly settingsService: SettingsService,
    @Optional() webSocket?: WSGateway,
  ) {
    super('NotificationSchema', webSocket);
    this.repository.subscribe('NotificationSchema', () => this.emit());
  }

  async create(
    createDto: CreateNotificationDto,
    sendDesktopNotification = false,
  ): Promise<Notification> {
    this.logger
      .withMetadata(createDto)
      .info(`Creating notification '${createDto.title}'`);
    if (sendDesktopNotification) {
      this.sendDesktopNotification(createDto);
    }

    return this.repository.insert(createDto);
  }

  async sendDesktopNotification(
    notification: CreateNotificationDto,
  ): Promise<void> {
    const { settings } = await this.settingsService.getDefaultSettings();
    const { desktopNotifications } = settings;
    const { tags, title, message, type } = notification;
    if (!desktopNotifications.enabled) {
      return;
    }

    if (
      desktopNotifications.showOnFileWatcherError &&
      tags.includes('file-watcher') &&
      type === 'error'
    ) {
      new ElectronNotification({
        title,
        body: message,
      }).show();
    }

    if (
      desktopNotifications.showOnFileWatcherSuccess &&
      tags.includes('file-watcher') &&
      type === 'success'
    ) {
      new ElectronNotification({
        title,
        body: message,
      }).show();
    }

    if (
      desktopNotifications.showOnPostError &&
      tags.includes('post') &&
      type === 'error'
    ) {
      new ElectronNotification({
        title,
        body: message,
      }).show();
    }

    if (
      desktopNotifications.showOnPostSuccess &&
      tags.includes('post') &&
      type === 'success'
    ) {
      new ElectronNotification({
        title,
        body: message,
      }).show();
    }
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

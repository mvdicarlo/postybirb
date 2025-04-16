import { Injectable, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NOTIFICATION_UPDATES } from '@postybirb/socket-events';
import { EntityId } from '@postybirb/types';
import { Notification as ElectronNotification } from 'electron';
import { PostyBirbService } from '../common/service/postybirb-service';
import { Notification } from '../drizzle/models/notification.entity';
import { SettingsService } from '../settings/settings.service';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { CreateNotificationDto } from './dtos/create-notification.dto';
import { UpdateNotificationDto } from './dtos/update-notification.dto';

/**
 * Service responsible for managing application notifications.
 * Handles creation, updating, and removal of notifications, as well as
 * sending desktop notifications based on user settings.
 */
@Injectable()
export class NotificationsService extends PostyBirbService<'NotificationSchema'> {
  /**
   * Creates a new instance of the NotificationsService.
   *
   * @param settingsService - Service for accessing application settings
   * @param webSocket - Optional websocket gateway for emitting events
   */
  constructor(
    private readonly settingsService: SettingsService,
    @Optional() webSocket?: WSGateway,
  ) {
    super('NotificationSchema', webSocket);
    this.repository.subscribe('NotificationSchema', () => this.emit());
    this.removeStaleNotifications();
  }

  /**
   * Removes notifications older than one month.
   * Runs automatically every hour via cron job.
   */
  @Cron(CronExpression.EVERY_HOUR)
  private async removeStaleNotifications() {
    const notifications = await this.repository.findAll();

    const aMonthAgo = new Date();
    aMonthAgo.setMonth(aMonthAgo.getMonth() - 1);
    const staleNotifications = notifications.filter(
      (notification) =>
        new Date(notification.createdAt).getTime() < aMonthAgo.getTime(),
    );
    if (staleNotifications.length) {
      await this.repository.deleteById(staleNotifications.map((n) => n.id));
    }
  }

  /**
   * Creates a new notification and optionally sends a desktop notification.
   *
   * @param createDto - The notification data to create
   * @param sendDesktopNotification - Whether to also send a desktop notification
   * @returns The created notification entity
   */
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

  /**
   * Sends a desktop notification based on user settings and notification type.
   *
   * @param notification - The notification data to display
   */
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

  /**
   * Updates an existing notification.
   *
   * @param id - The ID of the notification to update
   * @param update - The data to update
   * @returns The updated notification
   */
  update(id: EntityId, update: UpdateNotificationDto) {
    this.logger.withMetadata(update).info(`Updating notification '${id}'`);
    return this.repository.update(id, update);
  }

  /**
   * Emits notification updates to connected clients.
   * Converts entities to DTOs before sending.
   */
  protected async emit() {
    super.emit({
      event: NOTIFICATION_UPDATES,
      data: (await this.repository.findAll()).map((entity) => entity.toDTO()),
    });
  }
}

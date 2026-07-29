import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Notification, NotificationRepository } from '@postybirb/database';
import { PlatformService } from '@postybirb/platform';
import { EntityId } from '@postybirb/types';
import { PostyBirbService } from '../common/service/postybirb-service';
import { SettingsService } from '../settings/settings.service';
import { CreateNotificationDto } from './dtos/create-notification.dto';
import { UpdateNotificationDto } from './dtos/update-notification.dto';
import { NOTIFICATION_EVENT_PREFIX } from './notification.events';

/**
 * Service responsible for managing application notifications.
 * Handles creation, updating, and removal of notifications, as well as
 * sending desktop notifications based on user settings.
 */
@Injectable()
export class NotificationsService extends PostyBirbService<NotificationRepository> {
  /**
   * Creates a new instance of the NotificationsService.
   *
   * @param settingsService - Service for accessing application settings
   * @param platform - Platform service for desktop notifications
   * @param eventEmitter - Event emitter for CRUD event publication
   */
  constructor(
    private readonly settingsService: SettingsService,
    private readonly platform: PlatformService,
    eventEmitter: EventEmitter2,
  ) {
    super(new NotificationRepository());
    this.configureCrudEvents(NOTIFICATION_EVENT_PREFIX, eventEmitter);
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
      await this.removeMany(staleNotifications.map((n) => n.id));
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

    const entity = await this.repository.insert(createDto);
    this.publishCreated(entity.toDTO());
    return entity;
  }

  /**
   * Trims notifications to a maximum of 250, removing the oldest first.
   * Runs every 5 minutes.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  private async trimNotifications() {
    const notifications = await this.repository.findAll();
    if (notifications.length <= 250) {
      return;
    }
    const sorted = notifications.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const toRemove = sorted.slice(0, notifications.length - 250);
    await this.removeMany(toRemove.map((n) => n.id));
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

    const shouldShow =
      (desktopNotifications.showOnDirectoryWatcherError &&
        tags.includes('directory-watcher') &&
        type === 'error') ||
      (desktopNotifications.showOnDirectoryWatcherSuccess &&
        tags.includes('directory-watcher') &&
        type === 'success') ||
      (desktopNotifications.showOnPostError &&
        tags.includes('post') &&
        type === 'error') ||
      (desktopNotifications.showOnPostSuccess &&
        tags.includes('post') &&
        type === 'success');

    if (shouldShow) {
      this.platform.notification.show({ title, body: message });
    }
  }

  /**
   * Updates an existing notification.
   *
   * @param id - The ID of the notification to update
   * @param update - The data to update
   * @returns The updated notification
   */
  async update(id: EntityId, update: UpdateNotificationDto) {
    this.logger.withMetadata(update).info(`Updating notification '${id}'`);
    const entity = await this.repository.update(id, update);
    this.publishUpdated(entity.toDTO());
    return entity;
  }
}

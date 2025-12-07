/**
 * NotificationRecord - Concrete class for notification data.
 */

import type { INotification } from '@postybirb/types';
import { BaseRecord } from './base-record';

/**
 * Notification type for styling purposes.
 */
export type NotificationType = 'warning' | 'error' | 'info' | 'success';

/**
 * Record class representing a notification entity.
 */
export class NotificationRecord extends BaseRecord {
  readonly title: string;
  readonly message: string;
  readonly tags: string[];
  readonly data: Record<string, unknown>;
  readonly isRead: boolean;
  readonly hasEmitted: boolean;
  readonly type: NotificationType;

  constructor(dto: INotification) {
    super(dto);
    this.title = dto.title;
    this.message = dto.message;
    this.tags = dto.tags ?? [];
    this.data = dto.data ?? {};
    this.isRead = dto.isRead;
    this.hasEmitted = dto.hasEmitted;
    this.type = dto.type;
  }

  /**
   * Check if the notification is unread.
   */
  get isUnread(): boolean {
    return !this.isRead;
  }

  /**
   * Check if the notification is an error type.
   */
  get isError(): boolean {
    return this.type === 'error';
  }

  /**
   * Check if the notification is a warning type.
   */
  get isWarning(): boolean {
    return this.type === 'warning';
  }

  /**
   * Check if the notification has a specific tag.
   */
  hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }
}

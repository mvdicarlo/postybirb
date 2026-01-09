/**
 * Settings Record - Converts SettingsDto to a typed record class.
 */

import type {
    DesktopNotificationSettings,
    EntityId,
    ISettingsOptions,
    SettingsDto,
    TagSearchProviderSettings,
    WebsiteId,
} from '@postybirb/types';
import { BaseRecord } from './base-record';

/**
 * Settings record class that wraps a SettingsDto.
 */
export class SettingsRecord extends BaseRecord {
  /** The profile name for this settings record */
  readonly profile: string;

  /** The settings options */
  readonly settings: ISettingsOptions;

  constructor(dto: SettingsDto) {
    super(dto);
    this.profile = dto.profile;
    this.settings = dto.settings;
  }

  // ============================================================================
  // Convenience Getters
  // ============================================================================

  /** List of hidden website IDs */
  get hiddenWebsites(): WebsiteId[] {
    return this.settings.hiddenWebsites;
  }

  /** Current language setting */
  get language(): string {
    return this.settings.language;
  }

  /** Whether ads are allowed */
  get allowAd(): boolean {
    return this.settings.allowAd;
  }

  /** Whether the queue is paused */
  get queuePaused(): boolean {
    return this.settings.queuePaused;
  }

  /** Desktop notification settings */
  get desktopNotifications(): DesktopNotificationSettings {
    return this.settings.desktopNotifications;
  }

  /** Tag search provider settings */
  get tagSearchProvider(): TagSearchProviderSettings {
    return this.settings.tagSearchProvider;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Check if a website is hidden in settings.
   */
  isWebsiteHidden(websiteId: WebsiteId): boolean {
    return this.hiddenWebsites.includes(websiteId);
  }

  /**
   * Get a list of visible websites (filtering out hidden ones).
   */
  filterVisibleWebsites(allWebsiteIds: WebsiteId[]): WebsiteId[] {
    return allWebsiteIds.filter((id) => !this.isWebsiteHidden(id));
  }

  /**
   * Check if desktop notifications are enabled for a specific event type.
   */
  isDesktopNotificationEnabled(
    type: keyof Omit<DesktopNotificationSettings, 'enabled'>,
  ): boolean {
    return this.desktopNotifications.enabled && this.desktopNotifications[type];
  }

  /**
   * Convert back to a plain object for API updates.
   */
  toDto(): SettingsDto {
    return {
      id: this.id as EntityId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      profile: this.profile,
      settings: this.settings,
    };
  }
}

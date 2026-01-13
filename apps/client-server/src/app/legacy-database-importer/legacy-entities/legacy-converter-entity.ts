import { IEntity } from '@postybirb/types';

export type MinimalEntity<T extends IEntity> = Omit<
  T,
  'createdAt' | 'updatedAt'
>;

/**
 * Result of converting a legacy entity, optionally including website data.
 */
export interface LegacyConversionResult<T extends IEntity> {
  /**
   * The converted entity data, or null if the entity should be skipped.
   */
  entity: MinimalEntity<T> | null;

  /**
   * Optional website-specific data to be stored in WebsiteDataSchema.
   * Only applicable for Account entities with custom login flows.
   */
  websiteData?: Record<string, unknown>;
}

export interface LegacyConverterEntity<T extends IEntity> {
  _id: string;

  convert(): Promise<LegacyConversionResult<T>>;
}

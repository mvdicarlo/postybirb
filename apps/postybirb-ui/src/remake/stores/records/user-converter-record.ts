/**
 * UserConverterRecord - Concrete class for user converter data.
 */

import type { UserConverterDto, WebsiteId } from '@postybirb/types';
import { BaseRecord } from './base-record';

/**
 * Record class representing a user converter entity.
 */
export class UserConverterRecord extends BaseRecord {
  readonly username: string;
  readonly convertTo: Record<WebsiteId, string>;

  constructor(dto: UserConverterDto) {
    super(dto);
    this.username = dto.username;
    this.convertTo = dto.convertTo ?? {};
  }

  /**
   * Get the converted username for a specific website.
   */
  getConvertedUsername(websiteId: WebsiteId): string | undefined {
    return this.convertTo[websiteId];
  }

  /**
   * Check if there's a conversion for a specific website.
   */
  hasConversionFor(websiteId: WebsiteId): boolean {
    return websiteId in this.convertTo;
  }

  /**
   * Get all website IDs that have conversions.
   */
  get websiteIds(): WebsiteId[] {
    return Object.keys(this.convertTo) as WebsiteId[];
  }

  /**
   * Get the number of website conversions.
   */
  get conversionCount(): number {
    return Object.keys(this.convertTo).length;
  }
}

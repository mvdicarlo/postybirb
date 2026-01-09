/**
 * TagConverterRecord - Concrete class for tag converter data.
 */

import type { Tag, TagConverterDto, WebsiteId } from '@postybirb/types';
import { BaseRecord } from './base-record';

/**
 * Record class representing a tag converter entity.
 */
export class TagConverterRecord extends BaseRecord {
  readonly tag: Tag;
  readonly convertTo: Record<WebsiteId, Tag>;

  constructor(dto: TagConverterDto) {
    super(dto);
    this.tag = dto.tag;
    this.convertTo = dto.convertTo ?? {};
  }

  /**
   * Get the converted tag for a specific website.
   */
  getConvertedTag(websiteId: WebsiteId): Tag | undefined {
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

/**
 * TagGroupRecord - Concrete class for tag group data.
 */

import type { Tag, TagGroupDto } from '@postybirb/types';
import { BaseRecord } from './base-record';

/**
 * Record class representing a tag group entity.
 */
export class TagGroupRecord extends BaseRecord {
  readonly name: string;
  readonly tags: Tag[];

  constructor(dto: TagGroupDto) {
    super(dto);
    this.name = dto.name;
    this.tags = dto.tags ?? [];
  }

  /**
   * Check if the group contains a specific tag.
   */
  hasTag(tag: Tag): boolean {
    return this.tags.includes(tag);
  }

  /**
   * Get the number of tags in the group.
   */
  get tagCount(): number {
    return this.tags.length;
  }

  /**
   * Check if the group is empty.
   */
  get isEmpty(): boolean {
    return this.tags.length === 0;
  }

  /**
   * Get tags as a comma-separated string.
   */
  get tagsString(): string {
    return this.tags.join(', ');
  }
}

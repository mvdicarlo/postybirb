/**
 * CustomShortcutRecord - Concrete class for custom shortcut data.
 */

import type { Description, ICustomShortcutDto } from '@postybirb/types';
import { BaseRecord } from './base-record';

/**
 * Record class representing a custom shortcut entity.
 */
export class CustomShortcutRecord extends BaseRecord {
  readonly name: string;
  readonly shortcut: Description;

  constructor(dto: ICustomShortcutDto) {
    super(dto);
    this.name = dto.name;
    this.shortcut = dto.shortcut;
  }

  /**
   * Get the shortcut value for a specific part if it's a segmented description.
   */
  getShortcutValue(): string {
    // Description can be a complex type, return string representation
    if (typeof this.shortcut === 'string') {
      return this.shortcut;
    }
    // Handle DescriptionValue format
    return JSON.stringify(this.shortcut);
  }
}

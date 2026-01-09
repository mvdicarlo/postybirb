/**
 * Base record class that all entity records extend from.
 * Provides common functionality for converting DTOs to typed record classes.
 */

import type { EntityId } from '@postybirb/types';

/**
 * Base record interface for all entities.
 */
export interface IBaseRecord {
  readonly id: EntityId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Base record class providing common entity properties and utilities.
 * All record classes should extend this class.
 */
export abstract class BaseRecord implements IBaseRecord {
  readonly id: EntityId;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(dto: { id: EntityId; createdAt: string; updatedAt: string }) {
    this.id = dto.id;
    this.createdAt = new Date(dto.createdAt);
    this.updatedAt = new Date(dto.updatedAt);
  }

  /**
   * Check if this record matches the given id.
   */
  matches(id: EntityId): boolean {
    return this.id === id;
  }

  /**
   * Check if this record was updated after another record.
   */
  isNewerThan(other: BaseRecord): boolean {
    return this.updatedAt > other.updatedAt;
  }
}

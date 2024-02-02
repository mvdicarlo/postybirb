export type EntityId = string;

/**
 * An interface representing a base entity with common properties.
 */
export interface IEntity {
  /**
   * The unique identifier of the entity.
   * @type {EntityId}
   */
  id: EntityId;

  /**
   * The date when the entity was created.
   * @type {Date}
   */
  createdAt: Date;

  /**
   * The date when the entity was last updated.
   * @type {Date}
   */
  updatedAt: Date;
}

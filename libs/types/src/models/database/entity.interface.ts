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
   * The date string when the entity was created.
   * @type {string}
   */
  createdAt: string;

  /**
   * The date string when the entity was last updated.
   * @type {string}
   */
  updatedAt: string;
}

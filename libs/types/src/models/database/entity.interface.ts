/**
 * An interface representing a base entity with common properties.
 * @interface
 */
export interface IEntity {
  /**
   * The unique identifier of the entity.
   * @type {string}
   */
  id: string;

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

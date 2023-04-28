import { IEntity } from '../database/entity.interface';
import { AccountId } from './account.type';

/**
 * Represents an account with its associated properties.
 * @interface
 */
export interface IAccount extends IEntity {
  /**
   * The unique identifier of the account and the session partition key.
   * @type {string}
   */
  id: AccountId;

  /**
   * The display name of the account.
   * @type {string}
   */
  name: string;

  /**
   * The website associated with the account.
   * @type {string}
   */
  website: string;

  /**
   * The list of tags that the account is associated with.
   * @type {string[]}
   */
  groups: string[];
}

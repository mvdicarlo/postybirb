import { IBaseEntity } from '../../database/models/base-entity';

export interface IAccount extends IBaseEntity {
  /**
   * Id of an account and the session partition key.
   * @type {string}
   */
  id: string;

  /**
   * Display name.
   * @type {string}
   */
  name: string;

  /**
   * Website associated with Account.
   * @type {string}
   */
  website: string;

  /**
   * Tags that the account is listed under.
   * @type {string}
   */
  groups: string[];
}

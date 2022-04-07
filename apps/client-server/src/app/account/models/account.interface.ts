export interface IAccount {
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
   * Favorite status of an Account.
   * @type {boolean}
   */
  favorite: boolean;

  /**
   * User hidden status of an Account.
   * @type {boolean}
   */
  hidden: boolean;
}

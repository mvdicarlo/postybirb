/**
 * Interface representing the response of a login request.
 * @interface
 */
export interface ILoginResponse {
  /**
   * The username of the account that logged in. Optional.
   * @type {string|undefined}
   */
  username?: string;
  /**
   * A flag indicating whether the login was successful.
   * @type {boolean}
   */
  loggedIn: boolean;
}

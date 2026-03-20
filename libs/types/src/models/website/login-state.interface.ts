/**
 * Represents the login state of a website.
 * @interface
 */
export interface ILoginState {
  /**
   * Whether the user is currently logged in.
   * @type {boolean}
   */
  isLoggedIn: boolean;
  /**
   * The username of the logged-in user, or null if not logged in.
   * @type {(string | null)}
   */
  username: string | null;
  /**
   * Whether a login request is pending.
   * @type {boolean}
   */
  pending: boolean;
  /**
   * ISO 8601 timestamp of the last time the login state was updated.
   * Used to detect stale cached values.
   * @type {(string | null)}
   */
  lastUpdated: string | null;
}

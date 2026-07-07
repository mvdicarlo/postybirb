/**
 * The lifecycle status of a website login check.
 * - `idle`: no check has completed yet (initial state).
 * - `checking`: a login check is currently in progress.
 * - `loggedIn`: the last completed check found the user logged in.
 * - `loggedOut`: the last completed check found the user not logged in.
 */
export type LoginStatus = 'idle' | 'checking' | 'loggedIn' | 'loggedOut';

/**
 * Represents the login state of a website.
 *
 * `status` is the single source of truth; `isLoggedIn` and `pending` are
 * derived from it and included only for convenient/back-compatible consumption.
 * @interface
 */
export interface ILoginState {
  /**
   * The lifecycle status of the login check.
   * @type {LoginStatus}
   */
  status: LoginStatus;
  /**
   * Whether the user is currently logged in. Derived from
   * `status === 'loggedIn'`.
   * @type {boolean}
   */
  isLoggedIn: boolean;
  /**
   * The username of the logged-in user, or null if not logged in.
   * @type {(string | null)}
   */
  username: string | null;
  /**
   * Whether a login request is pending. Derived from `status === 'checking'`.
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

import { LoginResult } from './login-result.type';
import { ILoginState, LoginStatus } from './login-state.interface';

/**
 * Immutable value object tracking the login state of a website.
 *
 * Instances are never mutated: every transition returns a NEW frozen
 * `LoginState`. The login lifecycle (in the `Website` base class) owns all
 * transitions — website implementations report results via {@link LoginResult}
 * and never touch this class directly.
 *
 * `status` is the single source of truth; `isLoggedIn`/`pending` are derived.
 *
 * @class
 * @implements ILoginState
 */
export class LoginState implements ILoginState {
  /**
   * The lifecycle status of the login check.
   * @type {LoginStatus}
   */
  public readonly status: LoginStatus;

  /**
   * The username of the logged-in user, or null if not logged in.
   * @type {string | null}
   */
  public readonly username: string | null;

  /**
   * ISO 8601 timestamp of the last state change.
   * @type {string | null}
   */
  public readonly lastUpdated: string | null;

  private constructor(
    status: LoginStatus,
    username: string | null,
    lastUpdated: string | null,
  ) {
    this.status = status;
    this.username = username;
    this.lastUpdated = lastUpdated;
    Object.freeze(this);
  }

  /**
   * Whether the user is currently logged in. Derived from the status.
   */
  public get isLoggedIn(): boolean {
    return this.status === 'loggedIn';
  }

  /**
   * Whether a login check is currently in progress. Derived from the status.
   */
  public get pending(): boolean {
    return this.status === 'checking';
  }

  /**
   * Creates the initial `idle` login state (no check has completed yet).
   * @returns {LoginState}
   */
  public static initial(): LoginState {
    return new LoginState('idle', null, null);
  }

  /**
   * Returns a new state marking that a login check has started. Preserves the
   * current username so the UI can keep showing it while re-checking.
   * @returns {LoginState}
   */
  public beginCheck(): LoginState {
    return new LoginState('checking', this.username, new Date().toISOString());
  }

  /**
   * Returns a new state reflecting the outcome of a completed login check.
   * @param {LoginResult} result - The result reported by the website.
   * @returns {LoginState}
   */
  public resolve(result: LoginResult): LoginState {
    if (result.loggedIn) {
      return new LoginState(
        'loggedIn',
        result.username ?? null,
        new Date().toISOString(),
      );
    }
    return new LoginState('loggedOut', null, new Date().toISOString());
  }

  /**
   * Returns a new `loggedOut` state with no username. Used when login data is
   * explicitly cleared.
   * @returns {LoginState}
   */
  public reset(): LoginState {
    return new LoginState('loggedOut', null, new Date().toISOString());
  }

  /**
   * Returns a plain, serializable snapshot of the state, including the derived
   * `isLoggedIn` and `pending` fields.
   * @returns {ILoginState} A copy of the current login state.
   */
  public toDTO(): ILoginState {
    return {
      status: this.status,
      isLoggedIn: this.isLoggedIn,
      username: this.username,
      pending: this.pending,
      lastUpdated: this.lastUpdated,
    };
  }
}


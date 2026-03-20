import { ILoginState } from './login-state.interface';

/**
 * A class used for tracking the login state of a website.
 * @class
 * @implements ILoginState
 */
export class LoginState implements ILoginState {
  /**
   * Whether a login request is pending.
   * @type {boolean}
   */
  pending = false;

  /**
   * Whether the user is currently logged in.
   * @type {boolean}
   */
  isLoggedIn = false;

  /**
   * The username of the logged-in user, or null if not logged in.
   * @type {string | null}
   */
  username: string | null = null;

  /**
   * ISO 8601 timestamp of the last time the login state was updated.
   * @type {string | null}
   */
  lastUpdated: string | null = null;

  /**
   * Updates the lastUpdated timestamp to now.
   */
  private touch(): void {
    this.lastUpdated = new Date().toISOString();
  }

  /**
   * Logs the user out by resetting the login state.
   * @returns {LoginState} The current LoginState object.
   */
  public logout(): LoginState {
    this.isLoggedIn = false;
    this.username = null;
    this.pending = false;
    this.touch();
    return this;
  }

  /**
   * Sets the login state to the given values.
   * @param {boolean} isLoggedIn - Whether the user is currently logged in.
   * @param {string | null} username - The username of the logged-in user, or null if not logged in.
   * @returns {ILoginState} The current login state.
   */
  public setLogin(isLoggedIn: boolean, username: string | null): ILoginState {
    this.isLoggedIn = isLoggedIn;
    this.username = username;
    this.touch();
    return this.getState();
  }

  /**
   * Sets the pending flag.
   * @param {boolean} value - Whether a login request is pending.
   */
  public setPending(value: boolean): void {
    this.pending = value;
    this.touch();
  }

  /**
   * Returns a copy of the current login state.
   * @returns {ILoginState} A copy of the current login state.
   */
  getState(): ILoginState {
    return {
      isLoggedIn: this.isLoggedIn,
      username: this.username,
      pending: this.pending,
      lastUpdated: this.lastUpdated,
    };
  }
}

import { ILoginState } from '../interfaces/login-state.interface';

/**
 * A class used for tracking the login state of a website.
 */
export class LoginState implements ILoginState {
  isLoggedIn = false;
  username: string | null = null;

  public logout(): LoginState {
    this.isLoggedIn = false;
    this.username = null;
    return this;
  }

  public setLogin(isLoggedIn: boolean, username: string | null): LoginState {
    this.isLoggedIn = isLoggedIn;
    this.username = username;
    return this;
  }

  getState(): ILoginState {
    return {
      isLoggedIn: this.isLoggedIn,
      username: this.username,
    };
  }
}

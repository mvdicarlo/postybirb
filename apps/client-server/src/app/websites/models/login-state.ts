export interface ILoginState {
  isLoggedIn: boolean;
  username: string | null;
  pending: boolean;
}

/**
 * A class used for tracking the login state of a website.
 */
export class LoginState implements ILoginState {
  pending = false;

  isLoggedIn = false;

  username: string | null = null;

  public logout(): LoginState {
    this.isLoggedIn = false;
    this.username = null;
    this.pending = false;
    return this;
  }

  public setLogin(isLoggedIn: boolean, username: string | null): ILoginState {
    this.isLoggedIn = isLoggedIn;
    this.username = username;
    return this.getState();
  }

  getState(): ILoginState {
    return {
      ...this,
    };
  }
}

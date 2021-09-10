/**
 * A class used for tracking the login state of a website.
 */
export class LoginState {
  private isLoggedIn = false;
  private username: string | null = null;

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
}

/**
 * The result a website's `onLogin` returns to report whether the user is
 * currently authenticated.
 *
 * Websites perform pure detection and return this result; the login lifecycle
 * (see {@link LoginState}) is solely responsible for applying it to the login
 * state. Website implementations never mutate login state directly.
 */
export type LoginResult =
  | { loggedIn: true; username?: string | null }
  | { loggedIn: false };

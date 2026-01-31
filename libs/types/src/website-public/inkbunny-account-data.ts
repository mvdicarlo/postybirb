export type InkbunnyAccountData = {
  username?: string;
  sid?: string;
  folders?: string[];
};

/**
 * OAuth routes for Inkbunny login.
 * Note: password is only used in the request and never stored.
 */
export type InkbunnyOAuthRoutes = {
  login: {
    request: { username: string; password: string };
    response: void;
  };
};